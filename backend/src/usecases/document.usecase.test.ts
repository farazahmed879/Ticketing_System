import { describe, it, expect, vi } from "vitest";

vi.mock("../prisma", () => ({ default: {} }));

import { documentUsecase, DocumentError } from "./document.usecase";

describe("document validation", () => {
  it("accepts a known type and defaults the title", () => {
    const v = documentUsecase.validate({
      type: "payslip",
      recipientName: "  Ali Khan ",
      data: { payPeriod: "2026-11" },
    });
    expect(v).toEqual({
      type: "payslip",
      recipientName: "Ali Khan",
      title: "Pay Slip",
      data: { payPeriod: "2026-11" },
    });
  });

  it("rejects unknown types, missing recipient and missing data", () => {
    expect(() =>
      documentUsecase.validate({ type: "bogus", recipientName: "A", data: {} }),
    ).toThrow(DocumentError);
    expect(() =>
      documentUsecase.validate({ type: "offer_letter", recipientName: " ", data: {} }),
    ).toThrow(/Recipient name/);
    expect(() =>
      documentUsecase.validate({ type: "offer_letter", recipientName: "A", data: [] }),
    ).toThrow(/details/);
  });
});
