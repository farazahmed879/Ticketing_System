import { describe, it, expect, vi } from "vitest";
import { assertJwtSecret, jwtSecretProblem } from "./assertJwtSecret";

const STRONG = "x".repeat(48);

describe("jwtSecretProblem", () => {
  it("flags missing, placeholder and short secrets", () => {
    expect(jwtSecretProblem(undefined)).toMatch(/not set/);
    expect(jwtSecretProblem("super-secret-key-change-me")).toMatch(/placeholder/);
    expect(jwtSecretProblem("short-but-unique")).toMatch(/shorter/);
  });
  it("accepts a long random secret", () => {
    expect(jwtSecretProblem(STRONG)).toBeNull();
  });
});

describe("assertJwtSecret", () => {
  const run = (env: any) => {
    const exit = vi.fn() as any;
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    assertJwtSecret(env, exit);
    err.mockRestore();
    warn.mockRestore();
    return exit;
  };

  it("refuses to start production with the placeholder", () => {
    expect(run({ NODE_ENV: "production", JWT_SECRET: "super-secret-key-change-me" })).toHaveBeenCalledWith(1);
  });
  it("refuses to start anywhere with no secret", () => {
    expect(run({ NODE_ENV: "development" })).toHaveBeenCalledWith(1);
  });
  it("only warns in development for a weak secret", () => {
    expect(run({ NODE_ENV: "development", JWT_SECRET: "super-secret-key-change-me" })).not.toHaveBeenCalled();
  });
  it("starts production with a strong secret", () => {
    expect(run({ NODE_ENV: "production", JWT_SECRET: STRONG })).not.toHaveBeenCalled();
  });
});
