import { mutation } from "./_generated/server";
import { v } from "convex/values";

const blobArguments = {
  blobId: v.string(),
  runId: v.string(),
  ciphertext: v.string(),
  iv: v.string(),
  algorithm: v.literal("AES-256-GCM"),
  schemaVersion: v.literal(1),
  expiresAt: v.optional(v.number()),
};

export const storeEncryptedBlob = mutation({
  args: blobArguments,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Authentication is required to store receipt ciphertext.");
    const existing = await ctx.db.query("encryptedBlobs").withIndex("by_blob_id", (query) => query.eq("blobId", args.blobId)).unique();
    if (existing) throw new Error("This blob identifier already exists.");
    await ctx.db.insert("encryptedBlobs", {
      ...args,
      ownerSubject: identity.subject,
      createdAt: Date.now(),
    });
    return { blobId: args.blobId };
  },
});

export const getClaimBlob = mutation({
  args: { blobId: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const recent = await ctx.db
      .query("lookupAttempts")
      .withIndex("by_blob_id_and_time", (query) => query.eq("blobId", args.blobId).gte("attemptedAt", now - 60_000))
      .take(21);
    if (recent.length >= 20) throw new Error("Too many claim lookups. Wait one minute and retry.");
    await ctx.db.insert("lookupAttempts", { blobId: args.blobId, attemptedAt: now });

    const blob = await ctx.db.query("encryptedBlobs").withIndex("by_blob_id", (query) => query.eq("blobId", args.blobId)).unique();
    if (!blob || blob.revokedAt || (blob.expiresAt && blob.expiresAt <= now)) return null;
    return {
      schema: "shadowledger/encrypted-receipt/v1" as const,
      algorithm: blob.algorithm,
      blobId: blob.blobId,
      runId: blob.runId,
      iv: blob.iv,
      ciphertext: blob.ciphertext,
    };
  },
});

export const revokeEncryptedBlob = mutation({
  args: { blobId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Authentication is required to revoke a receipt.");
    const blob = await ctx.db.query("encryptedBlobs").withIndex("by_blob_id", (query) => query.eq("blobId", args.blobId)).unique();
    if (!blob || blob.ownerSubject !== identity.subject) throw new Error("Encrypted receipt not found.");
    await ctx.db.patch(blob._id, { revokedAt: Date.now() });
    return { blobId: args.blobId, revoked: true };
  },
});

// A token-gated fixture path makes local end-to-end testing possible without an
// identity provider. Production has no fixture token and therefore cannot call it.
export const storeDevelopmentFixture = mutation({
  args: { ...blobArguments, fixtureToken: v.string() },
  handler: async (ctx, args) => {
    const expected = process.env.SHADOWLEDGER_LOCAL_FIXTURE_TOKEN;
    if (!expected || args.fixtureToken !== expected) throw new Error("Development fixture access denied.");
    const existing = await ctx.db.query("encryptedBlobs").withIndex("by_blob_id", (query) => query.eq("blobId", args.blobId)).unique();
    if (existing) await ctx.db.delete(existing._id);
    await ctx.db.insert("encryptedBlobs", {
      blobId: args.blobId,
      runId: args.runId,
      ciphertext: args.ciphertext,
      iv: args.iv,
      algorithm: args.algorithm,
      schemaVersion: args.schemaVersion,
      expiresAt: args.expiresAt,
      ownerSubject: "local-development-fixture",
      createdAt: Date.now(),
    });
    return { blobId: args.blobId };
  },
});
