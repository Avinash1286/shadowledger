"use client";

import { ConvexHttpClient } from "convex/browser";

import { api } from "@/convex/_generated/api";
import type { EncryptedReceiptBlobV1 } from "@/lib/receipts/types";
import { isStarknetAddress } from "@/lib/strk20/address";

export async function storeEncryptedReceipt(convexUrl: string, blob: EncryptedReceiptBlobV1): Promise<void> {
  const client = new ConvexHttpClient(convexUrl);
  await client.mutation(api.encryptedBlobs.storeEncryptedBlob, {
    blobId: blob.blobId,
    runId: blob.runId,
    ciphertext: blob.ciphertext,
    iv: blob.iv,
    algorithm: blob.algorithm,
    schemaVersion: 1,
  });
}

export async function fetchEncryptedReceipt(convexUrl: string, blobId: string): Promise<EncryptedReceiptBlobV1 | null> {
  const client = new ConvexHttpClient(convexUrl);
  const blob = await client.mutation(api.encryptedBlobs.getClaimBlob, { blobId });
  if (!blob) return null;
  if (!isStarknetAddress(blob.runId)) throw new Error("Stored receipt has an invalid run binding.");
  return { ...blob, runId: blob.runId };
}
