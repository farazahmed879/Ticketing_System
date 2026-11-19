/**
 * Encryption at rest for HR document details (salary, earnings, deductions,
 * bank account, CNIC...). The database and its backups only hold ciphertext;
 * the server decrypts for Admin / Sub Admin and the document's employee.
 *
 * AES-256-GCM (authenticated: tampered data fails to decrypt). The key is
 * derived from DOCUMENT_ENCRYPTION_KEY. Losing or changing that secret makes
 * existing documents unreadable, including in older backups.
 *
 * Stored shape: { __enc: "v1", iv, tag, ct } (base64 strings).
 */
import crypto from "crypto";

const VERSION = "v1";

export interface EncryptedPayload {
  __enc: typeof VERSION;
  iv: string;
  tag: string;
  ct: string;
}

export class DocumentKeyMissingError extends Error {
  constructor() {
    super("Document encryption key (DOCUMENT_ENCRYPTION_KEY) is not configured");
  }
}

/** 32-byte key from the configured secret, or null when none is set. */
const keyFrom = (secret = process.env.DOCUMENT_ENCRYPTION_KEY): Buffer | null => {
  const s = secret?.trim();
  if (!s) return null;
  return crypto.createHash("sha256").update(s, "utf8").digest();
};

export const hasDocumentKey = () => keyFrom() !== null;

export const isEncrypted = (value: unknown): value is EncryptedPayload =>
  !!value &&
  typeof value === "object" &&
  (value as any).__enc === VERSION &&
  typeof (value as any).iv === "string" &&
  typeof (value as any).tag === "string" &&
  typeof (value as any).ct === "string";

/**
 * Encrypts document details. Without a configured key the details are
 * stored as-is (a startup warning says so) and encrypted later, once a key
 * is set, by encryptLegacyDocuments.
 */
export const encryptDocumentData = (data: unknown, secret?: string): unknown => {
  if (isEncrypted(data)) return data;
  const key = keyFrom(secret);
  if (!key) return data;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(JSON.stringify(data ?? {}), "utf8"), cipher.final()]);
  const payload: EncryptedPayload = {
    __enc: VERSION,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ct: ct.toString("base64"),
  };
  return payload;
};

/** Plain details back; unencrypted (older) data is returned unchanged. */
export const decryptDocumentData = (stored: unknown, secret?: string): Record<string, any> => {
  if (!isEncrypted(stored)) return (stored || {}) as Record<string, any>;
  const key = keyFrom(secret);
  if (!key) throw new DocumentKeyMissingError();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(stored.iv, "base64"));
  decipher.setAuthTag(Buffer.from(stored.tag, "base64"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(stored.ct, "base64")),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(plain);
};
