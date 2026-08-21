import { ConvexHttpClient } from "convex/browser";

import { api } from "@/convex/_generated/api";
import type { EncryptedReceiptBlobV1 } from "@/lib/receipts/types";

const LOCAL_CONVEX_URL = "http://127.0.0.1:3210";

function isEncryptedBlob(value: unknown): value is EncryptedReceiptBlobV1 {
  if (!value || typeof value !== "object") return false;
  const blob = value as Partial<EncryptedReceiptBlobV1>;
  return blob.schema === "shadowledger/encrypted-receipt/v1"
    && blob.algorithm === "AES-256-GCM"
    && typeof blob.blobId === "string"
    && typeof blob.runId === "string" && blob.runId.startsWith("0x")
    && typeof blob.iv === "string"
    && typeof blob.ciphertext === "string";
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return Response.json({ error: "Not found." }, { status: 404 });
  const fixtureToken = process.env.SHADOWLEDGER_LOCAL_FIXTURE_TOKEN;
  if (!fixtureToken) return Response.json({ error: "Local fixture storage is not configured." }, { status: 503 });
  const value: unknown = await request.json();
  if (!isEncryptedBlob(value)) return Response.json({ error: "Invalid encrypted blob." }, { status: 400 });
  try {
    const client = new ConvexHttpClient(LOCAL_CONVEX_URL);
    await client.mutation(api.encryptedBlobs.storeDevelopmentFixture, {
      blobId: value.blobId,
      runId: value.runId,
      ciphertext: value.ciphertext,
      iv: value.iv,
      algorithm: value.algorithm,
      schemaVersion: 1,
      fixtureToken,
    });
    return Response.json({ blobId: value.blobId });
  } catch (cause) {
    return Response.json({ error: cause instanceof Error ? cause.message : "Local ciphertext storage failed." }, { status: 500 });
  }
}
