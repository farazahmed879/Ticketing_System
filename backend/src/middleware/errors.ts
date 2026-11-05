import { Request, Response, NextFunction } from "express";

export const GENERIC_ERROR = "Something went wrong. Please try again.";

// Messages that reveal internals (DB driver, query shape, stack-ish runtime
// errors). Business-rule messages thrown by usecases ("Insufficient leave
// balance", "Cancelled Ticket can not be changed.") don't match and are kept,
// because the UI shows them to the user — many controllers send those with 500.
const INTERNAL_PATTERNS: RegExp[] = [
  /prisma/i,
  /invocation/i,
  /malformed objectid/i,
  /objectid/i,
  /unique constraint/i,
  /foreign key/i,
  /\bP\d{4}\b/, // Prisma error codes
  /mongo/i,
  /database/i,
  /server selection/i,
  /ECONN\w+|ETIMEDOUT|ENOTFOUND|EAI_AGAIN/,
  /cannot read propert/i,
  /cannot set propert/i,
  /is not a function/i,
  /is not defined/i,
  /is not iterable/i,
  /unexpected token/i,
  /maximum call stack/i,
  /\bat .+\(.+:\d+:\d+\)/, // stack frames
];

export function isInternalMessage(msg: unknown): boolean {
  if (typeof msg !== "string") return false;
  if (msg.includes("\n") || msg.length > 300) return true;
  return INTERNAL_PATTERNS.some((re) => re.test(msg));
}

/**
 * Wraps res.json so that 5xx responses never leak internal error text.
 * Controllers send { error } or { message }; both are checked. The original
 * is logged server-side with the request line for debugging.
 */
export function maskInternalErrors(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const originalJson = res.json.bind(res);
  res.json = (body?: any) => {
    if (res.statusCode >= 500 && body && typeof body === "object") {
      let masked = false;
      const out = { ...body };
      for (const field of ["error", "message"] as const) {
        if (isInternalMessage(out[field])) {
          out[field] = GENERIC_ERROR;
          masked = true;
        }
      }
      if (masked) {
        console.error(
          `[error] ${req.method} ${req.originalUrl} -> ${res.statusCode}:`,
          body.error ?? body.message,
        );
        return originalJson(out);
      }
    }
    return originalJson(body);
  };
  next();
}

/**
 * Final Express error handler for anything thrown/rejected outside a
 * controller's own try/catch (Express 5 forwards async rejections here).
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Malformed JSON body" });
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ message: "Request body too large" });
  }
  if (err?.name === "MulterError") {
    return res.status(400).json({ message: err.message });
  }
  console.error(`[error] unhandled ${req.method} ${req.originalUrl}:`, err);
  if (res.headersSent) return;
  res.status(500).json({ message: GENERIC_ERROR });
}
