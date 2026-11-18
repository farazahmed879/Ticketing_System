/**
 * Login sessions: short-lived access JWT + long-lived rotating refresh token.
 *
 * - Access token (JWT, 15 min) goes with every API call / socket handshake,
 *   exactly like before. It carries `sid` (the session id).
 * - Refresh token (random 256-bit) lives only in an httpOnly, Secure,
 *   SameSite=Strict cookie scoped to /api/auth. The DB keeps its SHA-256 hash.
 * - POST /api/auth/refresh swaps a valid refresh token for a new access token
 *   AND a new refresh token (rotation). Presenting an already-rotated token
 *   after the grace window means it was copied — every session of that user
 *   is revoked.
 *
 * "Remember me": 30-day sliding expiry (90-day hard cap) and a persistent
 * cookie. Without it: 12-hour sliding (24-hour cap) and a browser-session
 * cookie that is gone when the browser closes.
 */
import crypto from "crypto";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";
import { basePrisma as prisma } from "../prisma";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const ACCESS_TOKEN_TTL = "15m";
export const REFRESH_COOKIE = "jp_refresh";
const COOKIE_PATH = "/api/auth";

const LIFETIMES = {
  remember: { sliding: 30 * DAY_MS, absolute: 90 * DAY_MS },
  session: { sliding: 12 * HOUR_MS, absolute: 1 * DAY_MS },
};

/** Two tabs refreshing together send the same old token; tolerate that briefly. */
const ROTATION_GRACE_MS = 60 * 1000;

export class SessionError extends Error {}

const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

const newToken = () => crypto.randomBytes(32).toString("base64url");

export function signAccessToken(user: { id: string; roleType: string }, sessionId?: string) {
  return jwt.sign(
    { id: user.id, role: user.roleType, ...(sessionId ? { sid: sessionId } : {}) },
    process.env.JWT_SECRET as string,
    { expiresIn: ACCESS_TOKEN_TTL },
  );
}

// ---------------------------------------------------------------------------
// Cookie helpers (no cookie-parser dependency needed for one cookie).
// ---------------------------------------------------------------------------

/** Secure cookies need HTTPS; COOKIE_SECURE=false only for plain-HTTP setups. */
const cookieSecure = () =>
  process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE === "true"
    : process.env.NODE_ENV === "production";

export function readRefreshCookie(req: Request): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    if (part.slice(0, i).trim() === REFRESH_COOKIE) {
      return decodeURIComponent(part.slice(i + 1).trim()) || null;
    }
  }
  return null;
}

function setRefreshCookie(res: Response, token: string, remember: boolean, expiresAt: Date) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "strict",
    path: COOKIE_PATH,
    // No maxAge = browser-session cookie (cleared when the browser closes).
    ...(remember ? { expires: expiresAt } : {}),
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "strict",
    path: COOKIE_PATH,
  });
}

function clientInfo(req: Request) {
  return {
    userAgent: String(req.headers["user-agent"] || "").slice(0, 300) || null,
    ip: req.ip || null,
  };
}

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------

/** Create a session at login and set its cookie; returns the access token. */
export async function startSession(
  req: Request,
  res: Response,
  user: { id: string; roleType: string },
  remember: boolean,
): Promise<string> {
  const life = remember ? LIFETIMES.remember : LIFETIMES.session;
  const now = Date.now();
  const token = newToken();
  const session = await prisma.authSession.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      // Written as explicit nulls: on MongoDB, Prisma's `{ revokedAt: null }`
      // filter does not match a field that was never set, so leaving these
      // out made logout/revoke-all silently match nothing.
      revokedAt: null,
      previousTokenHash: null,
      rotatedAt: null,
      remember,
      expiresAt: new Date(now + life.sliding),
      absoluteExpiresAt: new Date(now + life.absolute),
      ...clientInfo(req),
    },
  });
  setRefreshCookie(res, token, remember, session.expiresAt);
  return signAccessToken(user, session.id);
}

/**
 * Exchange the refresh cookie for a new access token (and rotate the cookie).
 * Throws SessionError when the user has to log in again.
 */
export async function refreshSession(req: Request, res: Response): Promise<string> {
  const token = readRefreshCookie(req);
  if (!token) throw new SessionError("No session");
  const hash = hashToken(token);
  const now = new Date();

  let session = await prisma.authSession.findUnique({ where: { tokenHash: hash } });
  let isGraceReuse = false;

  if (!session) {
    // Maybe an already-rotated token.
    const rotated = await prisma.authSession.findFirst({ where: { previousTokenHash: hash } });
    if (!rotated) throw new SessionError("Invalid session");
    const withinGrace =
      rotated.rotatedAt && now.getTime() - rotated.rotatedAt.getTime() < ROTATION_GRACE_MS;
    if (!withinGrace) {
      // A token we already replaced is being replayed: treat as stolen.
      await revokeAllSessions(rotated.userId);
      console.warn(`[auth] Refresh token reuse for user ${rotated.userId}; all sessions revoked.`);
      throw new SessionError("Session revoked");
    }
    session = rotated;
    isGraceReuse = true;
  }

  if (session.revokedAt || session.expiresAt < now || session.absoluteExpiresAt < now) {
    throw new SessionError("Session expired");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, deleted: true, role: { select: { roleType: true, deleted: true } } },
  });
  if (!user || user.deleted || !user.role || user.role.deleted) {
    await prisma.authSession.update({ where: { id: session.id }, data: { revokedAt: now } });
    throw new SessionError("Account is no longer active");
  }

  if (!isGraceReuse) {
    // Rotate and slide the expiry (never past the hard cap).
    const life = session.remember ? LIFETIMES.remember : LIFETIMES.session;
    const next = newToken();
    const expiresAt = new Date(
      Math.min(now.getTime() + life.sliding, session.absoluteExpiresAt.getTime()),
    );
    await prisma.authSession.update({
      where: { id: session.id },
      data: {
        tokenHash: hashToken(next),
        previousTokenHash: hash,
        rotatedAt: now,
        lastUsedAt: now,
        expiresAt,
        ...clientInfo(req),
      },
    });
    setRefreshCookie(res, next, session.remember, expiresAt);
  }
  // On a grace reuse the other tab's response already set the new cookie in
  // this browser, so just hand out an access token.

  return signAccessToken({ id: user.id, roleType: user.role.roleType }, session.id);
}

/** Logout: revoke the session behind this browser's cookie. */
export async function endSession(req: Request, res: Response) {
  const token = readRefreshCookie(req);
  if (token) {
    await prisma.authSession.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  clearRefreshCookie(res);
}

/** Log a user out everywhere (password reset, account deleted, theft). */
export async function revokeAllSessions(userId: string, exceptSessionId?: string) {
  await prisma.authSession.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  });
}

/** Daily purge of sessions that ended more than a week ago. */
export function startSessionCleanupScheduler() {
  const purge = async () => {
    const cutoff = new Date(Date.now() - 7 * DAY_MS);
    try {
      const { count } = await prisma.authSession.deleteMany({
        where: {
          OR: [
            { revokedAt: { lt: cutoff } },
            { expiresAt: { lt: cutoff } },
            { absoluteExpiresAt: { lt: cutoff } },
          ],
        },
      });
      if (count) console.log(`[Sessions] Purged ${count} old session(s).`);
    } catch (err) {
      console.error("[Sessions] Cleanup failed:", err);
    }
  };
  purge();
  setInterval(purge, DAY_MS);
}
