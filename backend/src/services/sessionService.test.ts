import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import jwt from "jsonwebtoken";

// Minimal in-memory stand-in for the two Prisma models the service touches.
const { db } = vi.hoisted(() => {
  const sessions: any[] = [];
  const users: Record<string, any> = {};
  let seq = 0;
  const match = (s: any, where: any): boolean =>
    Object.entries(where).every(([k, v]: [string, any]) => {
      if (v && typeof v === "object" && "not" in v) return s[k] !== v.not;
      return s[k] === v; // undefined !== null, as in Prisma+MongoDB
    });
  return {
    db: {
      sessions,
      users,
      authSession: {
        create: async ({ data }: any) => {
          // Like MongoDB: fields the caller does not write are absent (undefined),
          // and a { field: null } filter only matches an explicit null.
          const row = { id: `s${++seq}`, ...data };
          sessions.push(row);
          return row;
        },
        findUnique: async ({ where }: any) => sessions.find((s) => match(s, where)) ?? null,
        findFirst: async ({ where }: any) => sessions.find((s) => match(s, where)) ?? null,
        update: async ({ where, data }: any) => {
          const s = sessions.find((x) => x.id === where.id);
          Object.assign(s, data);
          return s;
        },
        updateMany: async ({ where, data }: any) => {
          const hit = sessions.filter((s) => match(s, where));
          hit.forEach((s) => Object.assign(s, data));
          return { count: hit.length };
        },
      },
      user: {
        findUnique: async ({ where }: any) => users[where.id] ?? null,
      },
    },
  };
});

vi.mock("../prisma", () => ({ basePrisma: db, default: db }));

import {
  startSession,
  refreshSession,
  endSession,
  revokeAllSessions,
  SessionError,
  REFRESH_COOKIE,
} from "./sessionService";

process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-hs256-xxxxxxxx";

/** Fake req/res that remember the cookie like a browser would. */
function browser() {
  const jar: { value?: string; opts?: any } = {};
  const req = () =>
    ({
      headers: {
        "user-agent": "vitest",
        ...(jar.value ? { cookie: `other=1; ${REFRESH_COOKIE}=${jar.value}` } : {}),
      },
      ip: "127.0.0.1",
    }) as any;
  const res = {
    cookie: (_n: string, v: string, opts: any) => {
      jar.value = v;
      jar.opts = opts;
    },
    clearCookie: () => {
      jar.value = undefined;
    },
  } as any;
  return { jar, req, res };
}

const user = { id: "u1", roleType: "employee" };

describe("session refresh tokens", () => {
  beforeEach(() => {
    db.sessions.length = 0;
    db.users.u1 = { id: "u1", deleted: false, role: { roleType: "employee", deleted: false } };
    vi.useRealTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("login returns a 15-minute access token carrying the session id", async () => {
    const b = browser();
    const token = await startSession(b.req(), b.res, user, true);
    const payload: any = jwt.verify(token, process.env.JWT_SECRET!);
    expect(payload.id).toBe("u1");
    expect(payload.sid).toBe(db.sessions[0].id);
    expect(payload.exp - payload.iat).toBe(15 * 60);
    // Only the hash is stored, never the raw token.
    expect(db.sessions[0].tokenHash).not.toBe(b.jar.value);
  });

  it("remember-me sets a persistent httpOnly cookie; otherwise a browser-session cookie", async () => {
    const a = browser();
    await startSession(a.req(), a.res, user, true);
    expect(a.jar.opts).toMatchObject({ httpOnly: true, sameSite: "strict", path: "/api/auth" });
    expect(a.jar.opts.expires).toBeInstanceOf(Date);

    const b = browser();
    await startSession(b.req(), b.res, user, false);
    expect(b.jar.opts.expires).toBeUndefined();
  });

  it("refresh rotates the cookie and the old one stops working after the grace window", async () => {
    vi.useFakeTimers();
    const b = browser();
    await startSession(b.req(), b.res, user, true);
    const first = b.jar.value!;

    const oldReq = b.req();
    await refreshSession(b.req(), b.res);
    expect(b.jar.value).not.toBe(first);

    // Second tab with the old cookie inside the grace window: allowed.
    await expect(refreshSession(oldReq, browser().res)).resolves.toBeTypeOf("string");

    // Same old cookie two minutes later: treated as theft, everything revoked.
    vi.advanceTimersByTime(2 * 60 * 1000);
    await expect(refreshSession(oldReq, browser().res)).rejects.toBeInstanceOf(SessionError);
    expect(db.sessions.every((s) => s.revokedAt)).toBe(true);
    await expect(refreshSession(b.req(), b.res)).rejects.toBeInstanceOf(SessionError);
  });

  it("a remembered session survives a day offline (laptop closed overnight)", async () => {
    vi.useFakeTimers();
    const b = browser();
    await startSession(b.req(), b.res, user, true);
    vi.advanceTimersByTime(20 * 60 * 60 * 1000); // 20 hours later
    await expect(refreshSession(b.req(), b.res)).resolves.toBeTypeOf("string");
  });

  it("a non-remembered session expires after 12 idle hours", async () => {
    vi.useFakeTimers();
    const b = browser();
    await startSession(b.req(), b.res, user, false);
    vi.advanceTimersByTime(13 * 60 * 60 * 1000);
    await expect(refreshSession(b.req(), b.res)).rejects.toThrow("Session expired");
  });

  it("the 90-day hard cap applies even with daily use", async () => {
    vi.useFakeTimers();
    const b = browser();
    await startSession(b.req(), b.res, user, true);
    for (let day = 0; day < 89; day++) {
      vi.advanceTimersByTime(24 * 60 * 60 * 1000);
      await refreshSession(b.req(), b.res);
    }
    vi.advanceTimersByTime(2 * 24 * 60 * 60 * 1000);
    await expect(refreshSession(b.req(), b.res)).rejects.toThrow("Session expired");
  });

  it("logout revokes only this browser's session", async () => {
    const a = browser();
    const b = browser();
    await startSession(a.req(), a.res, user, true);
    await startSession(b.req(), b.res, user, true);
    const aReq = a.req();
    await endSession(aReq, a.res);
    await expect(refreshSession(aReq, a.res)).rejects.toBeInstanceOf(SessionError);
    await expect(refreshSession(b.req(), b.res)).resolves.toBeTypeOf("string");
  });

  it("revokeAllSessions can keep the current device signed in", async () => {
    const a = browser();
    const b = browser();
    const tokenA = await startSession(a.req(), a.res, user, true);
    await startSession(b.req(), b.res, user, true);
    const sid = (jwt.decode(tokenA) as any).sid;
    await revokeAllSessions("u1", sid);
    await expect(refreshSession(a.req(), a.res)).resolves.toBeTypeOf("string");
    await expect(refreshSession(b.req(), b.res)).rejects.toBeInstanceOf(SessionError);
  });

  it("a deleted user cannot refresh", async () => {
    const b = browser();
    await startSession(b.req(), b.res, user, true);
    db.users.u1.deleted = true;
    await expect(refreshSession(b.req(), b.res)).rejects.toThrow("Account is no longer active");
  });

  it("no cookie means no session", async () => {
    await expect(refreshSession(browser().req(), browser().res)).rejects.toThrow("No session");
  });
});
