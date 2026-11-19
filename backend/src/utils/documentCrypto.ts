/**
 * Encryption at rest for HR document details (salary, earnings, deductions,
 * bank account, CNIC...). The database and its backups only hold ciphertext.
 *
 * - Details are encrypted with AES-256-GCM (authenticated: tampered data or a
 *   wrong key fails to decrypt) under a random 256-bit data key.
 * - The data key is never stored in plain form or in server settings. It's
 *   saved in the database wrapped (AES-256-GCM) with a key derived by scrypt
 *   from a passphrase only Admin / Sub Admin know (see documentVault).
 * - After each server start an Admin / Sub Admin unlocks it with the
 *   passphrase; it then lives only in this process's memory.
 *
 * Stored shape of encrypted data: { __enc: "v1", iv, tag, ct } (base64).
 */
import crypto from "crypto";

const VERSION = "v1";

export interface EncryptedPayload {
  __enc: typeof VERSION;
  iv: string;
  tag: string;
  ct: string;
}

/** Documents are locked: the data key isn't in memory. */
export class DocumentKeyMissingError extends Error {
  constructor() {
    super("Documents are locked");
  }
}

// ---------- the in-memory data key ----------

let activeKey: Buffer | null = null;

export const setActiveDocumentKey = (key: Buffer | null) => {
  if (key && key.length !== 32) throw new Error("Document key must be 32 bytes");
  activeKey = key ? Buffer.from(key) : null;
};

export const hasActiveDocumentKey = () => activeKey !== null;

/**
 * Data key from the older DOCUMENT_ENCRYPTION_KEY setting, if any. Only used
 * until the passphrase vault is set up, which then takes this key over so
 * documents encrypted with it stay readable.
 */
export const legacyEnvKey = (secret = process.env.DOCUMENT_ENCRYPTION_KEY): Buffer | null => {
  const s = secret?.trim();
  return s ? crypto.createHash("sha256").update(s, "utf8").digest() : null;
};

// ---------- encrypting / decrypting details ----------

export const isEncrypted = (value: unknown): value is EncryptedPayload =>
  !!value &&
  typeof value === "object" &&
  (value as any).__enc === VERSION &&
  typeof (value as any).iv === "string" &&
  typeof (value as any).tag === "string" &&
  typeof (value as any).ct === "string";

const seal = (plain: Buffer, key: Buffer): EncryptedPayload => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  return {
    __enc: VERSION,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ct: ct.toString("base64"),
  };
};

const open = (payload: EncryptedPayload, key: Buffer): Buffer => {
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(payload.ct, "base64")), decipher.final()]);
};

/** Encrypts document details with the unlocked key (or the given one). */
export const encryptDocumentData = (data: unknown, key: Buffer | null = activeKey): EncryptedPayload => {
  if (isEncrypted(data)) return data;
  if (!key) throw new DocumentKeyMissingError();
  return seal(Buffer.from(JSON.stringify(data ?? {}), "utf8"), key);
};

/** Plain details back; unencrypted (older) data is returned unchanged. */
export const decryptDocumentData = (
  stored: unknown,
  key: Buffer | null = activeKey,
): Record<string, any> => {
  if (!isEncrypted(stored)) return (stored || {}) as Record<string, any>;
  if (!key) throw new DocumentKeyMissingError();
  return JSON.parse(open(stored, key).toString("utf8"));
};

// ---------- passphrase wrapping of the data key ----------

export interface KdfParams {
  name: "scrypt";
  N: number;
  r: number;
  p: number;
  salt: string; // base64
}

export const MIN_PASSPHRASE_LENGTH = 12;

/** scrypt, N=2^15: ~100ms per try, which makes guessing slow. */
export const newKdfParams = (): KdfParams => ({
  name: "scrypt",
  N: 2 ** 15,
  r: 8,
  p: 1,
  salt: crypto.randomBytes(16).toString("base64"),
});

const deriveKek = (passphrase: string, kdf: KdfParams): Promise<Buffer> =>
  new Promise((resolve, reject) =>
    crypto.scrypt(
      passphrase.normalize("NFKC"),
      Buffer.from(kdf.salt, "base64"),
      32,
      { N: kdf.N, r: kdf.r, p: kdf.p, maxmem: 128 * kdf.N * kdf.r * 2 },
      (err, key) => (err ? reject(err) : resolve(key)),
    ),
  );

export const newDataKey = () => crypto.randomBytes(32);

/** The data key encrypted with the passphrase. */
export const wrapDataKey = async (dataKey: Buffer, passphrase: string, kdf: KdfParams) =>
  seal(dataKey, await deriveKek(passphrase, kdf));

/** The data key, or null when the passphrase is wrong. */
export const unwrapDataKey = async (
  wrapped: EncryptedPayload,
  passphrase: string,
  kdf: KdfParams,
): Promise<Buffer | null> => {
  try {
    return open(wrapped, await deriveKek(passphrase, kdf));
  } catch {
    return null;
  }
};
