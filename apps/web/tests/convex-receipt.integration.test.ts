import { ConvexHttpClient } from "convex/browser";
import { describe, expect, it } from "vitest";

import { api } from "../convex/_generated/api";
import { decryptReceipt, encryptReceipt } from "../lib/receipts/crypto";
import type { RecipientReceiptV1 } from "../lib/receipts/types";

const convexUrl = process.env.SHADOWLEDGER_TEST_CONVEX_URL;
const fixtureToken = process.env.SHADOWLEDGER_LOCAL_FIXTURE_TOKEN;

describe.skipIf(!convexUrl || !fixtureToken)("local Convex encrypted receipt", () => {
  it("stores only ciphertext and decrypts after a fragment-equivalent key is supplied", async () => {
    const receipt: RecipientReceiptV1 = {
      schema: "shadowledger/recipient-receipt/v1",
      runId: "0x20260821",
      recipient: "0xdeadbeef",
      token: "0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
      amount: "123456789987654321",
      period: "2026-08",
      memo: "never stored as plaintext",
      merkleProof: { leaf: "0x1", siblings: ["0x2"], directions: ["right"] },
    };
    const encrypted = await encryptReceipt(receipt);
    const client = new ConvexHttpClient(convexUrl!);
    await client.mutation(api.encryptedBlobs.storeDevelopmentFixture, {
      blobId: encrypted.blob.blobId,
      runId: encrypted.blob.runId,
      ciphertext: encrypted.blob.ciphertext,
      iv: encrypted.blob.iv,
      algorithm: encrypted.blob.algorithm,
      schemaVersion: 1,
      fixtureToken: fixtureToken!,
    });
    const stored = await client.mutation(api.encryptedBlobs.getClaimBlob, { blobId: encrypted.blob.blobId });
    expect(stored).not.toBeNull();
    expect(JSON.stringify(stored)).not.toContain(receipt.recipient);
    expect(JSON.stringify(stored)).not.toContain(receipt.amount);
    expect(JSON.stringify(stored)).not.toContain(receipt.memo);
    await expect(decryptReceipt({ ...stored!, runId: stored!.runId as `0x${string}` }, encrypted.key)).resolves.toEqual(receipt);
  });
});
