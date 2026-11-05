import { Request, Response, NextFunction } from "express";

/**
 * Minimal in-memory fixed-window rate limiter.
 *
 * In-memory means limits are per server process — fine for a single instance.
 * If you run several instances behind a load balancer, move the store to
 * Redis/Mongo so the counts are shared.
 *
 * Behind a reverse proxy, set TRUST_PROXY (see index.ts) or every request
 * will appear to come from the proxy's IP.
 */
interface Options {
  windowMs: number;
  max: number;
  /** Builds the bucket key; defaults to the client IP. */
  key?: (req: Request) => string;
  /** Only count responses with status >= 400 (e.g. failed logins). */
  countFailuresOnly?: boolean;
  message?: string;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export function rateLimit(opts: Options) {
  const store = new Map<string, Bucket>();
  const keyOf = opts.key ?? ((req: Request) => req.ip || "unknown");
  const message =
    opts.message ?? "Too many requests. Please wait and try again later.";

  // Drop expired buckets so the map can't grow without bound.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [k, b] of store) if (b.resetAt <= now) store.delete(k);
  }, Math.min(opts.windowMs, 60_000));
  sweep.unref?.();

  const middleware = (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = keyOf(req);
    let bucket = store.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + opts.windowMs };
      store.set(key, bucket);
    }

    if (bucket.count >= opts.max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({ message, retryAfterSeconds: retryAfter });
    }

    if (opts.countFailuresOnly) {
      const b = bucket;
      res.on("finish", () => {
        if (res.statusCode >= 400) b.count++;
      });
    } else {
      bucket.count++;
    }
    next();
  };

  /** Test helper: forget all counts. */
  middleware.reset = () => store.clear();
  return middleware;
}

const lowerIdentifier = (req: Request) =>
  String(req.body?.email ?? "").trim().toLowerCase().slice(0, 254);

/** Failed logins per IP + account: 10 per 15 minutes. */
export const loginAccountLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 10,
  countFailuresOnly: true,
  key: (req) => `${req.ip}|${lowerIdentifier(req)}`,
  message: "Too many failed login attempts. Please wait 15 minutes and try again.",
});

/** All login attempts per IP (catches spraying many accounts): 100 / 15 min. */
export const loginIpLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 100,
  message: "Too many login attempts from this network. Please try again later.",
});

/** Unauthenticated endpoints that write data (login-help, register): 5 / hour / IP. */
export const publicWriteLimiter = rateLimit({
  windowMs: 60 * 60_000,
  max: 5,
  message: "Too many requests. Please try again in an hour.",
});
