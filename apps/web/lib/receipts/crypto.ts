import type {
  ClaimSecret,
  EncryptedReceiptBlobV1,
  EncryptedRecoveryBundleV1,
  RecipientReceiptV1,
  RecoveryBundleSecret,
} from "@/lib/receipts/types";
import { isStarknetAddress } from "@/lib/strk20/address";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

function buffer(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}

function webCrypto(): Crypto {
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto is unavailable in this browser.");
  return globalThis.crypto;
}

export function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

export function fromBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error("Invalid base64url value.");
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  try {
    return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  } catch {
    throw new Error("Invalid base64url value.");
  }
}

function randomBytes(length: number): Uint8Array {
  return webCrypto().getRandomValues(new Uint8Array(length));
}

async function importAesKey(encodedKey: string, usage: KeyUsage): Promise<CryptoKey> {
  const bytes = fromBase64Url(encodedKey);
  if (bytes.length !== 32) throw new Error("Claim keys must contain exactly 256 bits.");
  return webCrypto().subtle.importKey("raw", buffer(bytes), "AES-GCM", false, [usage]);
}

function receiptAad(blobId: string, runId: string): Uint8Array {
  return encoder.encode(`shadowledger/encrypted-receipt/v1\n${blobId}\n${runId}`);
}

export function parseReceipt(value: unknown): RecipientReceiptV1 {
  if (!value || typeof value !== "object") throw new Error("Receipt must be a JSON object.");
  const receipt = value as Partial<RecipientReceiptV1>;
  if (receipt.schema !== "shadowledger/recipient-receipt/v1") throw new Error("Unsupported receipt schema.");
  if (!receipt.runId || !isStarknetAddress(receipt.runId)) throw new Error("Receipt runId is invalid.");
  if (!receipt.recipient || !isStarknetAddress(receipt.recipient)) throw new Error("Receipt recipient is invalid.");
  if (!receipt.token || !isStarknetAddress(receipt.token)) throw new Error("Receipt token is invalid.");
  if (!receipt.amount || !/^\d+$/u.test(receipt.amount) || BigInt(receipt.amount) <= 0n) throw new Error("Receipt amount is invalid.");
  if (!receipt.period?.trim()) throw new Error("Receipt period is required.");
  if (!receipt.merkleProof || !isStarknetAddress(receipt.merkleProof.leaf)) throw new Error("Receipt proof is invalid.");
  if (receipt.merkleProof.siblings.length !== receipt.merkleProof.directions.length) throw new Error("Receipt proof lengths do not match.");
  if (!receipt.merkleProof.siblings.every(isStarknetAddress)) throw new Error("Receipt proof contains an invalid sibling.");
  return receipt as RecipientReceiptV1;
}

export async function encryptReceipt(receipt: RecipientReceiptV1): Promise<ClaimSecret> {
  const validated = parseReceipt(receipt);
  const keyBytes = randomBytes(32);
  const key = toBase64Url(keyBytes);
  const blobId = toBase64Url(randomBytes(24));
  const iv = randomBytes(12);
  const cryptoKey = await importAesKey(key, "encrypt");
  const ciphertext = await webCrypto().subtle.encrypt(
    { name: "AES-GCM", iv: buffer(iv), additionalData: buffer(receiptAad(blobId, validated.runId)), tagLength: 128 },
    cryptoKey,
    buffer(encoder.encode(JSON.stringify(validated))),
  );
  return {
    key,
    blob: {
      schema: "shadowledger/encrypted-receipt/v1",
      algorithm: "AES-256-GCM",
      blobId,
      runId: validated.runId,
      iv: toBase64Url(iv),
      ciphertext: toBase64Url(new Uint8Array(ciphertext)),
    },
  };
}

export async function decryptReceipt(blob: EncryptedReceiptBlobV1, encodedKey: string): Promise<RecipientReceiptV1> {
  if (blob.schema !== "shadowledger/encrypted-receipt/v1" || blob.algorithm !== "AES-256-GCM") {
    throw new Error("Unsupported encrypted receipt format.");
  }
  const iv = fromBase64Url(blob.iv);
  if (iv.length !== 12) throw new Error("Encrypted receipt IV is invalid.");
  try {
    const plaintext = await webCrypto().subtle.decrypt(
      { name: "AES-GCM", iv: buffer(iv), additionalData: buffer(receiptAad(blob.blobId, blob.runId)), tagLength: 128 },
      await importAesKey(encodedKey, "decrypt"),
      buffer(fromBase64Url(blob.ciphertext)),
    );
    const parsed: unknown = JSON.parse(decoder.decode(plaintext));
    const receipt = parseReceipt(parsed);
    if (receipt.runId !== blob.runId) throw new Error("Receipt run binding does not match.");
    return receipt;
  } catch (cause) {
    if (cause instanceof Error && cause.message === "Receipt run binding does not match.") throw cause;
    throw new Error("This claim key is wrong or the encrypted receipt was modified.");
  }
}

export function buildClaimLink(appUrl: string, blobId: string, key: string): string {
  const url = new URL(`/claim/${encodeURIComponent(blobId)}`, appUrl);
  url.hash = new URLSearchParams({ key }).toString();
  return url.toString();
}

export function readClaimKey(fragment: string): string {
  const key = new URLSearchParams(fragment.replace(/^#/u, "")).get("key");
  if (!key || fromBase64Url(key).length !== 32) throw new Error("The claim link does not contain a valid decryption key.");
  return key;
}

function recoveryAad(bundleId: string): Uint8Array {
  return encoder.encode(`shadowledger/encrypted-recovery/v1\n${bundleId}`);
}

export async function createRecoveryBundle(claimLinks: readonly string[]): Promise<RecoveryBundleSecret> {
  if (claimLinks.length === 0) throw new Error("At least one claim link is required.");
  const key = toBase64Url(randomBytes(32));
  const bundleId = toBase64Url(randomBytes(18));
  const iv = randomBytes(12);
  const ciphertext = await webCrypto().subtle.encrypt(
    { name: "AES-GCM", iv: buffer(iv), additionalData: buffer(recoveryAad(bundleId)), tagLength: 128 },
    await importAesKey(key, "encrypt"),
    buffer(encoder.encode(JSON.stringify({ schema: "shadowledger/recovery-contents/v1", createdAt: new Date().toISOString(), claimLinks }))),
  );
  const bundle: EncryptedRecoveryBundleV1 = {
    schema: "shadowledger/encrypted-recovery/v1",
    algorithm: "AES-256-GCM",
    bundleId,
    iv: toBase64Url(iv),
    ciphertext: toBase64Url(new Uint8Array(ciphertext)),
  };
  return { bundle, key };
}

export async function decryptRecoveryBundle(bundle: EncryptedRecoveryBundleV1, key: string): Promise<readonly string[]> {
  try {
    const plaintext = await webCrypto().subtle.decrypt(
      { name: "AES-GCM", iv: buffer(fromBase64Url(bundle.iv)), additionalData: buffer(recoveryAad(bundle.bundleId)), tagLength: 128 },
      await importAesKey(key, "decrypt"),
      buffer(fromBase64Url(bundle.ciphertext)),
    );
    const decoded = JSON.parse(decoder.decode(plaintext)) as { claimLinks?: unknown };
    if (!Array.isArray(decoded.claimLinks) || !decoded.claimLinks.every((value) => typeof value === "string")) throw new Error();
    return decoded.claimLinks;
  } catch {
    throw new Error("The recovery key is wrong or the bundle was modified.");
  }
}
