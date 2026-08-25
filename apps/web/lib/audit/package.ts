import { num } from "starknet";

import {
  buildPayrollTree,
  canonicalizeManifest,
  computeManifestHash,
} from "@/lib/payroll/commitment";
import type { PayrollCommitment, PayrollEntryV1, PayrollManifestV1 } from "@/lib/payroll/commitment-types";
import { addressesEqual } from "@/lib/strk20/address";

export type AuditPackageV1 = {
  schema: "shadowledger/audit-package/v1";
  warning: "Contains the complete private payroll. Keep local and delete after review.";
  manifest: PayrollManifestV1;
  manifestHash: `0x${string}`;
  entries: Array<{
    index: number;
    recipient: `0x${string}`;
    token: `0x${string}`;
    amount: string;
    periodHash: `0x${string}`;
    memoHash: `0x${string}`;
    salt: `0x${string}`;
  }>;
};

export type AuditReport = {
  valid: boolean;
  recomputed: { merkleRoot: `0x${string}`; manifestHash: `0x${string}`; aggregateAmount: string; recipientCount: number } | null;
  checks: { name: string; ok: boolean; detail: string }[];
};

const hex = (value: string | bigint) => num.toHex(BigInt(value)) as `0x${string}`;

export function buildAuditPackage(commitment: PayrollCommitment): AuditPackageV1 {
  return {
    schema: "shadowledger/audit-package/v1",
    warning: "Contains the complete private payroll. Keep local and delete after review.",
    manifest: commitment.manifest,
    manifestHash: hex(commitment.manifestHash),
    entries: commitment.entries.map((entry) => ({
      index: entry.index,
      recipient: hex(entry.recipient),
      token: hex(entry.token),
      amount: entry.amount.toString(10),
      periodHash: hex(entry.periodHash),
      memoHash: hex(entry.memoHash),
      salt: hex(entry.salt),
    })),
  };
}

export function parseAuditPackage(text: string): AuditPackageV1 {
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || (parsed as AuditPackageV1).schema !== "shadowledger/audit-package/v1") {
    throw new Error("Unsupported audit package schema.");
  }
  const result = parsed as AuditPackageV1;
  if (!result.manifest || !Array.isArray(result.entries)) throw new Error("Audit package is incomplete.");
  return result;
}

export function verifyAuditPackage(pkg: AuditPackageV1): AuditReport {
  const checks: AuditReport["checks"] = [];
  const check = (name: string, ok: boolean, detail: string) => checks.push({ name, ok, detail });
  try {
    const entries: PayrollEntryV1[] = pkg.entries.map((entry) => ({
      index: entry.index,
      recipient: entry.recipient,
      token: entry.token,
      amount: BigInt(entry.amount),
      periodHash: BigInt(entry.periodHash),
      memoHash: BigInt(entry.memoHash),
      salt: BigInt(entry.salt),
    }));
    const tree = buildPayrollTree(entries, BigInt(pkg.manifest.runId));
    const aggregate = entries.reduce((total, entry) => total + entry.amount, 0n);
    const manifestHash = computeManifestHash(canonicalizeManifest(pkg.manifest));
    const recomputed: NonNullable<AuditReport["recomputed"]> = {
      merkleRoot: hex(tree.merkleRoot),
      manifestHash: hex(manifestHash),
      aggregateAmount: aggregate.toString(10),
      recipientCount: entries.length,
    };
    check("Merkle root", tree.merkleRoot === BigInt(pkg.manifest.merkleRoot), "All private rows reproduce the public Poseidon root.");
    check("Manifest hash", manifestHash === BigInt(pkg.manifestHash), "Canonical manifest reproduces the supplied hash.");
    check("Aggregate", aggregate === BigInt(pkg.manifest.aggregateAmount), "Private amounts reproduce the public aggregate.");
    check("Recipient count", entries.length === pkg.manifest.recipientCount, "Private row count reproduces the public count.");
    check("Token", entries.every((entry) => addressesEqual(entry.token, pkg.manifest.token)), "Every private row uses the committed token.");
    check("Period", entries.every((entry) => entry.periodHash === BigInt(pkg.manifest.periodHash)), "Every private row uses the committed period hash.");
    return { valid: checks.every((item) => item.ok), recomputed, checks };
  } catch (error) {
    check("Package decoding", false, error instanceof Error ? error.message : "Package values could not be decoded.");
    return { valid: false, recomputed: null, checks };
  }
}
