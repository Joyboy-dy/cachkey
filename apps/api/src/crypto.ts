import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/*
 * Envelope encryption of secrets.
 *
 * - The instance master key (ENCRYPTION_KEY) never touches secret values: it only encrypts
 *   one random data key per project (`Project.encryptedKey`).
 * - Each value is encrypted with its project's data key.
 * - AES-256-GCM everywhere, with a random 96-bit IV per encryption. The additional
 *   authenticated data (AAD) binds a ciphertext to its owner, so a value copied into another
 *   project, environment or brick row fails to decrypt instead of leaking.
 *
 * Ciphertext format: `v1.<iv base64>.<ciphertext+tag base64>`.
 */

const VERSION = "v1";
const IV_BYTES = 12;
const TAG_BYTES = 16;

export function encrypt(key: Buffer, plaintext: Buffer | string, aad: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const body = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
  return `${VERSION}.${iv.toString("base64")}.${body.toString("base64")}`;
}

export function decrypt(key: Buffer, payload: string, aad: string): Buffer {
  const [version, ivPart, bodyPart] = payload.split(".");
  if (version !== VERSION || !ivPart || !bodyPart) throw new Error("Unknown ciphertext format");
  const iv = Buffer.from(ivPart, "base64");
  const body = Buffer.from(bodyPart, "base64");
  if (iv.length !== IV_BYTES || body.length < TAG_BYTES) throw new Error("Corrupted ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(body.subarray(body.length - TAG_BYTES));
  return Buffer.concat([
    decipher.update(body.subarray(0, body.length - TAG_BYTES)),
    decipher.final(),
  ]);
}

/**
 * Whether a ciphertext holds an empty plaintext, without decrypting it: GCM adds no padding,
 * so an empty value is the tag alone. (The length of a value is not secret from the database.)
 */
export function isEmptyCiphertext(payload: string): boolean {
  const bodyPart = payload.split(".")[2];
  return bodyPart !== undefined && Buffer.from(bodyPart, "base64").length === TAG_BYTES;
}

export function generateDataKey(): Buffer {
  return randomBytes(32);
}

/** Data key of a project, wrapped with the master key. */
export function wrapDataKey(masterKey: Buffer, dataKey: Buffer, projectId: string): string {
  return encrypt(masterKey, dataKey, `project-key:${projectId}`);
}

export function unwrapDataKey(masterKey: Buffer, wrapped: string, projectId: string): Buffer {
  return decrypt(masterKey, wrapped, `project-key:${projectId}`);
}

/**
 * Where a value lives: its environment and its brick. `brickId` is null for the main brick,
 * whose values keep the binding they had before bricks existed (no re-encryption needed).
 */
export type ValueOwner = { environmentId: string; brickId: string | null };

/** AAD of a variable value: tied to its environment and brick, not its name (renames work). */
export function secretAad({ environmentId, brickId }: ValueOwner): string {
  return brickId ? `secret:${environmentId}:brick:${brickId}` : `secret:${environmentId}`;
}

export function encryptSecret(dataKey: Buffer, owner: ValueOwner, value: string): string {
  return encrypt(dataKey, value, secretAad(owner));
}

export function decryptSecret(dataKey: Buffer, owner: ValueOwner, payload: string): string {
  return decrypt(dataKey, payload, secretAad(owner)).toString("utf8");
}
