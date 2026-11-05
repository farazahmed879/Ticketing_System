// Placeholder values that have shipped in this repo's env files / history.
// A token signed with any of these can be forged by anyone who has seen them.
const KNOWN_WEAK_SECRETS = new Set([
  "super-secret-key-change-me",
  "secret",
  "changeme",
  "change-me",
]);

const MIN_LENGTH = 32;

/**
 * Returns a problem description for the given JWT secret, or null if OK.
 */
export function jwtSecretProblem(secret: string | undefined): string | null {
  if (!secret) return "JWT_SECRET is not set";
  if (KNOWN_WEAK_SECRETS.has(secret.trim().toLowerCase())) {
    return "JWT_SECRET is a known placeholder value";
  }
  if (secret.length < MIN_LENGTH) {
    return `JWT_SECRET is shorter than ${MIN_LENGTH} characters`;
  }
  return null;
}

/**
 * Fail fast on a missing or weak JWT secret. Production refuses to start;
 * other environments start with a loud warning so local dev isn't blocked.
 */
export function assertJwtSecret(
  env: NodeJS.ProcessEnv = process.env,
  exit: (code: number) => never = process.exit,
) {
  const problem = jwtSecretProblem(env.JWT_SECRET);
  if (!problem) return;

  const hint =
    "Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\"";
  if (env.NODE_ENV === "production" || !env.JWT_SECRET) {
    console.error(`[startup] FATAL: ${problem}. Refusing to start. ${hint}`);
    exit(1);
  }
  console.warn(
    `[startup] WARNING: ${problem}. Tokens can be forged. ${hint}`,
  );
}
