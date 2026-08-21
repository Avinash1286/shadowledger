import { describe, expect, it } from "vitest";

import {
  buildClaimLink,
  createRecoveryBundle,
  decryptReceipt,
  decryptRecoveryBundle,
  encryptReceipt,
  fromBase64Url,
  readClaimKey,
  toBase64Url,
} from "../lib/receipts/crypto";
import type { RecipientReceiptV1 } from "../lib/receipts/types";

const RECEIPT: RecipientReceiptV1 = {
  schema: "shadowledger/recipient-receipt/v1",
  runId: "0x20260821",
  recipient: "0x123456789abc",
  token: "0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
  amount: "987654321012345678",
  period: "2026-08",
  memo: "confidential salary row",
  merkleProof: { leaf: "0x111", siblings: ["0x222"], directions: ["right"] },
};

function mutateBase64Url(value: string): string {
  const bytes = fromBase64Url(value);
  bytes[Math.floor(bytes.length / 2)]! ^= 1;
  return toBase64Url(bytes);
}

describe("AES-GCM recipient receipts", () => {
  it("round trips only with the fragment key", async () => {
    const encrypted = await encryptReceipt(RECEIPT);
    const link = buildClaimLink("https://shadowledger.example", encrypted.blob.blobId, encrypted.key);
    expect(new URL(link).search).toBe("");
    expect(readClaimKey(new URL(link).hash)).toBe(encrypted.key);
    await expect(decryptReceipt(encrypted.blob, encrypted.key)).resolves.toEqual(RECEIPT);
  });

  it("reveals no payroll field in stored ciphertext JSON", async () => {
    const encrypted = await encryptReceipt(RECEIPT);
    const stored = JSON.stringify(encrypted.blob);
    expect(stored).not.toContain(RECEIPT.recipient);
    expect(stored).not.toContain(RECEIPT.amount);
    expect(stored).not.toContain(RECEIPT.memo);
    expect(stored).not.toContain(encrypted.key);
  });

  it("rejects a wrong key, ciphertext tamper, and AAD tamper", async () => {
    const encrypted = await encryptReceipt(RECEIPT);
    const wrong = await encryptReceipt(RECEIPT);
    await expect(decryptReceipt(encrypted.blob, wrong.key)).rejects.toThrow(/wrong or.*modified/u);
    await expect(decryptReceipt({ ...encrypted.blob, ciphertext: mutateBase64Url(encrypted.blob.ciphertext) }, encrypted.key)).rejects.toThrow(/wrong or.*modified/u);
    await expect(decryptReceipt({ ...encrypted.blob, blobId: `${encrypted.blob.blobId}x` }, encrypted.key)).rejects.toThrow(/wrong or.*modified/u);
  });

  it("encrypts the admin recovery bundle with a separate key", async () => {
    const encrypted = await encryptReceipt(RECEIPT);
    const link = buildClaimLink("https://shadowledger.example", encrypted.blob.blobId, encrypted.key);
    const recovery = await createRecoveryBundle([link]);
    expect(recovery.key).not.toBe(encrypted.key);
    await expect(decryptRecoveryBundle(recovery.bundle, recovery.key)).resolves.toEqual([link]);
    await expect(decryptRecoveryBundle(recovery.bundle, encrypted.key)).rejects.toThrow(/wrong or.*modified/u);
  });
});
