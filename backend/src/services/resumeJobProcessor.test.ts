import { describe, expect, it, vi } from "vitest";

// Importing the processor pulls in Prisma/Drive/LlamaParse; none are called here.
vi.mock("../prisma", () => ({ default: {} }));

const { looksLikePersonName } = await import("./resumeJobProcessor");

describe("looksLikePersonName", () => {
  it("accepts real names", () => {
    for (const n of ["Hadia Sajjad", "Ahmed M. Nabray Alsayed", "Muhammad Asad Ahsan", "Leen Alghamdi"]) {
      expect(looksLikePersonName(n)).toBe(true);
    }
  });

  it("rejects headings, schools and titles picked up as names", () => {
    for (const n of [
      "Bahria University",
      "Process Flow Diagrams.",
      "Ms Computer Science",
      "Work Experience",
      "Profile Summary",
      "Project Outcomes.",
      "Associate Technical Project Manager",
      "Shehzar Warsiproduct Manager",
      "Haziq Sheikh Pmp | AI",
      "",
      null,
    ]) {
      expect(looksLikePersonName(n)).toBe(false);
    }
  });
});
