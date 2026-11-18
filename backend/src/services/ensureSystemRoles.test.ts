import { describe, it, expect, vi } from "vitest";

vi.mock("../prisma", () => ({ basePrisma: {} }));

import { withoutDelete } from "./ensureSystemRoles";

describe("Sub Admin permissions", () => {
  it("copies Admin permissions with every delete switched off", () => {
    const admin = {
      tickets: { view: true, create: true, update: true, delete: true },
      reports: { view: true },
      boardStatuses: { s1: true, s2: false },
    };
    expect(withoutDelete(admin)).toEqual({
      tickets: { view: true, create: true, update: true, delete: false },
      reports: { view: true },
      boardStatuses: { s1: true, s2: false },
    });
    expect(admin.tickets.delete).toBe(true); // input untouched
  });

  it("handles missing permissions", () => {
    expect(withoutDelete(null)).toEqual({});
  });
});
