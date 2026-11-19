/**
 * The document passphrase "vault": keeps the HR document encryption key out
 * of server settings so that only Admin / Sub Admin can open documents.
 *
 * States:
 * - not set up: no passphrase yet. Issuing documents is blocked until an
 *   Admin / Sub Admin sets one (older unencrypted documents stay readable).
 * - locked: after every server start. Nobody (employees included) can open
 *   documents until an Admin / Sub Admin enters the passphrase.
 * - unlocked: the data key is in this process's memory only.
 *
 * Losing the passphrase means losing every encrypted document: there is no
 * recovery. In-memory state is per server process (one backend instance).
 */
import prisma from "../prisma";
import {
  EncryptedPayload,
  KdfParams,
  MIN_PASSPHRASE_LENGTH,
  hasActiveDocumentKey,
  legacyEnvKey,
  newDataKey,
  newKdfParams,
  setActiveDocumentKey,
  unwrapDataKey,
  wrapDataKey,
} from "../utils/documentCrypto";
import { DocumentError } from "./documentError";

export type VaultState = "not_set_up" | "locked" | "unlocked";

let unlockedBy: { name: string; at: Date } | null = null;

const loadVault = () => prisma.documentVault.findUnique({ where: { key: "global" } });

const nameOf = async (userId: string) =>
  (await prisma.user.findUnique({ where: { id: userId }, select: { fullname: true } }))
    ?.fullname || "Admin";

const checkNewPassphrase = (passphrase: unknown): string => {
  if (typeof passphrase !== "string" || passphrase.trim().length < MIN_PASSPHRASE_LENGTH) {
    throw new DocumentError(
      `The passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters long`,
    );
  }
  if (passphrase.length > 200) throw new DocumentError("The passphrase is too long");
  return passphrase;
};

/** Called after unlocking / setting up (encrypts older documents). */
let onUnlocked: () => Promise<void> = async () => {};
export const setOnUnlocked = (fn: () => Promise<void>) => {
  onUnlocked = fn;
};

const activate = async (key: Buffer, userId: string) => {
  setActiveDocumentKey(key);
  unlockedBy = { name: await nameOf(userId), at: new Date() };
  // Encrypt anything stored unencrypted, in the background.
  onUnlocked().catch((err) => console.error("[documents] post-unlock work failed:", err));
};

export const documentVault = {
  async state(): Promise<VaultState> {
    if (!(await loadVault())) return "not_set_up";
    return hasActiveDocumentKey() ? "unlocked" : "locked";
  },

  async status() {
    const vault = await loadVault();
    return {
      state: !vault ? "not_set_up" : hasActiveDocumentKey() ? "unlocked" : "locked",
      setAt: vault?.updatedAt ?? null,
      setByName: vault?.setByName ?? null,
      unlockedAt: hasActiveDocumentKey() ? (unlockedBy?.at ?? null) : null,
      unlockedByName: hasActiveDocumentKey() ? (unlockedBy?.name ?? null) : null,
      minLength: MIN_PASSPHRASE_LENGTH,
    };
  },

  /** Throws the right message unless documents can be encrypted right now. */
  async assertUnlocked() {
    const state = await this.state();
    if (state === "not_set_up") {
      throw new DocumentError(
        "Set a document passphrase before issuing documents (Documents page → Security).",
        423,
      );
    }
    if (state === "locked") {
      throw new DocumentError(
        "Documents are locked. An Admin or Sub Admin must unlock them with the document passphrase.",
        423,
      );
    }
  },

  /**
   * First-time setup. Takes over the key from the older
   * DOCUMENT_ENCRYPTION_KEY setting when present, so documents encrypted
   * with it stay readable; otherwise a new random key.
   */
  async setup(passphrase: unknown, userId: string) {
    const pass = checkNewPassphrase(passphrase);
    if (await loadVault()) throw new DocumentError("A document passphrase is already set");
    const dataKey = legacyEnvKey() ?? newDataKey();
    const kdf = newKdfParams();
    const wrappedKey = await wrapDataKey(dataKey, pass, kdf);
    const setByName = await nameOf(userId);
    try {
      await prisma.documentVault.create({
        data: { key: "global", kdf: kdf as any, wrappedKey: wrappedKey as any, setById: userId, setByName },
      });
    } catch {
      // Unique key: someone else set it up at the same moment.
      throw new DocumentError("A document passphrase is already set");
    }
    console.log(`[documents] Document passphrase set up by ${setByName}.`);
    await activate(dataKey, userId);
    return this.status();
  },

  async unlock(passphrase: unknown, userId: string) {
    const vault = await loadVault();
    if (!vault) throw new DocumentError("No document passphrase has been set up yet", 404);
    if (typeof passphrase !== "string" || !passphrase) {
      throw new DocumentError("Enter the document passphrase");
    }
    const key = await unwrapDataKey(
      vault.wrappedKey as unknown as EncryptedPayload,
      passphrase,
      vault.kdf as unknown as KdfParams,
    );
    // 400, not 401: the frontend treats 401 as an expired login (refreshes
    // the session and replays the request).
    if (!key) throw new DocumentError("Incorrect passphrase", 400);
    await activate(key, userId);
    console.log(`[documents] Documents unlocked by ${unlockedBy?.name}.`);
    return this.status();
  },

  /** Re-locks the data key with a new passphrase (documents are unchanged). */
  async changePassphrase(current: unknown, next: unknown, userId: string) {
    const vault = await loadVault();
    if (!vault) throw new DocumentError("No document passphrase has been set up yet", 404);
    const pass = checkNewPassphrase(next);
    const key = await unwrapDataKey(
      vault.wrappedKey as unknown as EncryptedPayload,
      typeof current === "string" ? current : "",
      vault.kdf as unknown as KdfParams,
    );
    if (!key) throw new DocumentError("The current passphrase is incorrect", 400);
    const kdf = newKdfParams();
    const wrappedKey = await wrapDataKey(key, pass, kdf);
    const setByName = await nameOf(userId);
    await prisma.documentVault.update({
      where: { key: "global" },
      data: { kdf: kdf as any, wrappedKey: wrappedKey as any, setById: userId, setByName },
    });
    console.log(`[documents] Document passphrase changed by ${setByName}.`);
    await activate(key, userId);
    return this.status();
  },

  /** Forget the key now (until someone unlocks again). */
  async lock(userId: string) {
    setActiveDocumentKey(null);
    unlockedBy = null;
    console.log(`[documents] Documents locked by ${await nameOf(userId)}.`);
    return this.status();
  },

  /**
   * On startup. With a vault: start locked; the old DOCUMENT_ENCRYPTION_KEY
   * setting is ignored. Without one: the old setting (if any) keeps earlier
   * encrypted documents readable until a passphrase is set up.
   */
  async init() {
    try {
      const vault = await loadVault();
      const envKey = legacyEnvKey();
      if (vault) {
        setActiveDocumentKey(null);
        console.log("[documents] Documents are locked until an Admin / Sub Admin unlocks them.");
        if (envKey) {
          console.warn(
            "[documents] DOCUMENT_ENCRYPTION_KEY is ignored now that a document passphrase is set. Remove it from the server settings.",
          );
        }
      } else {
        setActiveDocumentKey(envKey);
        console.warn(
          "[documents] No document passphrase set yet: an Admin / Sub Admin must set one on the Documents page before issuing documents.",
        );
      }
    } catch (err) {
      console.error("[documents] Could not load the document vault:", err);
    }
  },
};
