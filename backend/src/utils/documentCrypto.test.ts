import { describe, expect, it } from "vitest";
import {
  DocumentKeyMissingError,
  decryptDocumentData,
  encryptDocumentData,
  isEncrypted,
} from "./documentCrypto";

const KEY = "test-key-for-document-encryption-0123456789";
const DATA = {
  salary: "250000",
  currency: "PKR",
  earnings: [{ label: "Basic", amount: "200000" }],
  accountNo: "PK36SCBL0000001123456702",
};

describe("documentCrypto", () => {
  it("round-trips document details", () => {
    const enc = encryptDocumentData(DATA, KEY);
    expect(isEncrypted(enc)).toBe(true);
    expect(decryptDocumentData(enc, KEY)).toEqual(DATA);
  });

  it("stores no readable salary or account number", () => {
    const stored = JSON.stringify(encryptDocumentData(DATA, KEY));
    expect(stored).not.toContain("250000");
    expect(stored).not.toContain("PK36SCBL");
    expect(stored).not.toContain("Basic");
  });

  it("uses a fresh IV each time", () => {
    const a = encryptDocumentData(DATA, KEY) as any;
    const b = encryptDocumentData(DATA, KEY) as any;
    expect(a.iv).not.toBe(b.iv);
    expect(a.ct).not.toBe(b.ct);
  });

  it("does not double-encrypt", () => {
    const enc = encryptDocumentData(DATA, KEY);
    expect(encryptDocumentData(enc, KEY)).toBe(enc);
  });

  it("rejects the wrong key and tampered data", () => {
    const enc = encryptDocumentData(DATA, KEY) as any;
    expect(() => decryptDocumentData(enc, "another-key")).toThrow();
    const ct = Buffer.from(enc.ct, "base64");
    ct[0] ^= 1;
    expect(() => decryptDocumentData({ ...enc, ct: ct.toString("base64") }, KEY)).toThrow();
  });

  it("returns older unencrypted details unchanged", () => {
    expect(decryptDocumentData(DATA, KEY)).toEqual(DATA);
  });

  it("needs the key to open encrypted details", () => {
    const enc = encryptDocumentData(DATA, KEY);
    const saved = process.env.DOCUMENT_ENCRYPTION_KEY;
    delete process.env.DOCUMENT_ENCRYPTION_KEY;
    try {
      expect(() => decryptDocumentData(enc)).toThrow(DocumentKeyMissingError);
    } finally {
      if (saved !== undefined) process.env.DOCUMENT_ENCRYPTION_KEY = saved;
    }
  });
});
