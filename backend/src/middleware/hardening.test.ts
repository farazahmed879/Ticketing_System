import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import express from "express";
import type { Server } from "http";
import { rateLimit } from "./rateLimit";
import { validateBody, schemas } from "./validate";
import { maskInternalErrors, errorHandler, GENERIC_ERROR } from "./errors";
import { redactUser } from "../controllers/user.controller";
import { registrationEnabled } from "../controllers/auth.controller";

const accountLimiter = rateLimit({
  windowMs: 60_000,
  max: 3,
  countFailuresOnly: true,
  key: (req) => `${req.ip}|${req.body?.email}`,
});

let server: Server;
let base: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use(maskInternalErrors);

  // Fake login: password "good" succeeds, anything else is 401.
  app.post("/login", validateBody(schemas.login), accountLimiter, (req, res) => {
    if (req.body.password === "good") return res.json({ ok: true });
    res.status(401).json({ message: "Invalid credentials" });
  });
  app.post("/register", registrationEnabled, (_req, res) => res.json({ ok: true }));
  app.post("/users", validateBody(schemas.updateUser), (req, res) => res.json(req.body));
  app.get("/prisma-error", (_req, res) => {
    res.status(500).json({
      success: false,
      error: "\nInvalid `prisma.ticket.findUnique()` invocation:\nMalformed ObjectID",
    });
  });
  app.get("/business-error", (_req, res) => {
    res.status(500).json({ error: "Insufficient leave balance. Requested 2 day(s), available 1." });
  });
  app.get("/throws", async () => {
    throw new Error("connect ECONNREFUSED 127.0.0.1:27017");
  });
  app.use(errorHandler);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address() as any;
  base = `http://127.0.0.1:${addr.port}`;
});

afterAll(() => new Promise<void>((r) => server.close(() => r())));

const post = (path: string, body: unknown, raw = false) =>
  fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: raw ? (body as string) : JSON.stringify(body),
  });

describe("login rate limiting", () => {
  beforeEach(() => accountLimiter.reset());

  it("locks an account after 3 failures, with Retry-After", async () => {
    for (let i = 0; i < 3; i++) {
      expect((await post("/login", { email: "a", password: "bad" })).status).toBe(401);
    }
    const blocked = await post("/login", { email: "a", password: "good" });
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("successful logins don't count, and other accounts aren't affected", async () => {
    for (let i = 0; i < 5; i++) {
      expect((await post("/login", { email: "b", password: "good" })).status).toBe(200);
    }
    for (let i = 0; i < 3; i++) await post("/login", { email: "c", password: "bad" });
    expect((await post("/login", { email: "d", password: "good" })).status).toBe(200);
  });
});

describe("input validation", () => {
  it("rejects a non-string login identifier (operator injection)", async () => {
    const res = await post("/login", { email: { not: "" }, password: "x" });
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/email/);
  });

  it("update accepts a blank password but rejects a short one", async () => {
    expect((await post("/users", { password: "", fullname: "A" })).status).toBe(200);
    const res = await post("/users", { password: "123" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/password: Must be at least 6/);
  });

  it("rejects a malformed roleId and keeps unknown fields", async () => {
    expect((await post("/users", { roleId: "not-an-id" })).status).toBe(400);
    const ok = await post("/users", { cnic: "12345", branch: "KHI" });
    expect(await ok.json()).toEqual({ cnic: "12345", branch: "KHI" });
  });
});

describe("error masking", () => {
  it("hides Prisma internals in 5xx responses", async () => {
    const body = await (await fetch(base + "/prisma-error")).json();
    expect(body).toEqual({ success: false, error: GENERIC_ERROR });
  });

  it("keeps user-facing business messages", async () => {
    const body = await (await fetch(base + "/business-error")).json();
    expect(body.error).toMatch(/Insufficient leave balance/);
  });

  it("uncaught errors become a generic 500", async () => {
    const res = await fetch(base + "/throws");
    expect(res.status).toBe(500);
    expect((await res.json()).message).toBe(GENERIC_ERROR);
  });

  it("malformed JSON is a 400, not a 500", async () => {
    expect((await post("/login", "{bad json", true)).status).toBe(400);
  });
});

describe("registration switch", () => {
  it("is disabled unless ALLOW_PUBLIC_REGISTRATION=true", async () => {
    delete process.env.ALLOW_PUBLIC_REGISTRATION;
    expect((await post("/register", {})).status).toBe(403);
    process.env.ALLOW_PUBLIC_REGISTRATION = "true";
    expect((await post("/register", {})).status).toBe(200);
    delete process.env.ALLOW_PUBLIC_REGISTRATION;
  });
});

describe("redactUser", () => {
  const user = { id: "u2", fullname: "B", cnic: "42101", address: "x", leaves: 5, primaryContact: "0300" };
  const req = (role: string, id = "u1") => ({ user: { id, role } }) as any;

  it("hides private fields from colleagues but keeps directory info", () => {
    const out = redactUser(req("employee"), user);
    expect(out).not.toHaveProperty("cnic");
    expect(out).not.toHaveProperty("address");
    expect(out).not.toHaveProperty("leaves");
    expect(out.primaryContact).toBe("0300");
  });

  it("shows everything to admin, HR and the user themselves", () => {
    expect(redactUser(req("admin"), user)).toHaveProperty("cnic");
    expect(redactUser(req("hr"), user)).toHaveProperty("cnic");
    expect(redactUser(req("client", "u2"), user)).toHaveProperty("cnic");
  });
});
