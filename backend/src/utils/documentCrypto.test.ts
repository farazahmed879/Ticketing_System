import { afterEach, describe, expect, it } from "vitest";
import {
  DocumentKeyMissingError,
  decryptDocumentData,
  encryptDocumentData,
  hasActiveDocumentKey,
  isEncrypted,
  newDataKey,
  newKdfParams,
  setActiveDocumentKey,
  unwrapDataKey,
  wrapDataKey,
} from "./documentCrypto";

const KEY = newDataKey();
const DATA = {
  salary: "250000",
  currency: "PKR",
  earnings: [{ label: "Basic", amount: "200000" }],
  accountNo: "PK36SCBL0000001123456702",
};

afterEach(() => setActiveDocumentKey(null));

describe("document data encryption", () => {
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

  it("uses a fresh IV each time and never double-encrypts", () => {
    const a = encryptDocumentData(DATA, KEY);
    const b = encryptDocumentData(DATA, KEY);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ct).not.toBe(b.ct);
    expect(encryptDocumentData(a, KEY)).toBe(a);
  });

  it("rejects the wrong key and tampered data", () => {
    const enc = encryptDocumentData(DATA, KEY);
    expect(() => decryptDocumentData(enc, newDataKey())).toThrow();
    const ct = Buffer.from(enc.ct, "base64");
    ct[0] ^= 1;
    expect(() => decryptDocumentData({ ...enc, ct: ct.toString("base64") }, KEY)).toThrow();
  });

  it("returns older unencrypted details unchanged", () => {
    expect(decryptDocumentData(DATA, KEY)).toEqual(DATA);
  });

  it("is locked until a key is in memory", () => {
    const enc = encryptDocumentData(DATA, KEY);
    expect(hasActiveDocumentKey()).toBe(false);
    expect(() => decryptDocumentData(enc)).toThrow(DocumentKeyMissingError);
    expect(() => encryptDocumentData(DATA)).toThrow(DocumentKeyMissingError);
    setActiveDocumentKey(KEY);
    expect(decryptDocumentData(enc)).toEqual(DATA);
  });
});

describe("passphrase wrapping", () => {
  it("unwraps the data key only with the right passphrase", async () => {
    const kdf = newKdfParams();
    const wrapped = await wrapDataKey(KEY, "correct horse battery staple", kdf);
    expect(JSON.stringify(wrapped)).not.toContain(KEY.toString("base64"));
    expect((await unwrapDataKey(wrapped, "correct horse battery staple", kdf))?.equals(KEY)).toBe(true);
    expect(await unwrapDataKey(wrapped, "wrong passphrase!!", kdf)).toBeNull();
  });

  it("uses a new salt for every passphrase", () => {
    expect(newKdfParams().salt).not.toBe(newKdfParams().salt);
  });
});
