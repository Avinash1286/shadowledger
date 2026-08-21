import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  encryptedBlobs: defineTable({
    blobId: v.string(),
    runId: v.string(),
    ciphertext: v.string(),
    iv: v.string(),
    algorithm: v.literal("AES-256-GCM"),
    schemaVersion: v.literal(1),
    ownerSubject: v.string(),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
  })
    .index("by_blob_id", ["blobId"])
    .index("by_owner", ["ownerSubject"]),
  lookupAttempts: defineTable({
    blobId: v.string(),
    attemptedAt: v.number(),
  }).index("by_blob_id_and_time", ["blobId", "attemptedAt"]),
});
