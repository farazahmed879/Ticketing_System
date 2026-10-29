import { describe, expect, it } from "vitest";
import { normalizePhone } from "./resumeAiParserService";

describe("normalizePhone", () => {
  it("keeps a foreign country code", () => {
    expect(normalizePhone("+966 56 952 3539", "+966")).toBe("+966 569523539");
    expect(normalizePhone("00966569523539", "+966")).toBe("+966 569523539");
  });

  it("defaults to Pakistan when the code is unknown", () => {
    expect(normalizePhone("0300-1234567", null)).toBe("+92 03001234567");
    expect(normalizePhone("+92 300 1234567", null)).toBe("+92 3001234567");
  });

  it("returns null without a number", () => {
    expect(normalizePhone(null, "+966")).toBeNull();
  });
});
