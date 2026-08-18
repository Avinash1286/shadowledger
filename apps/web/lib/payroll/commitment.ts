import { num, validateAndParseAddress } from "starknet";

import type {
  PayrollCommitment,
  PayrollEntryV1,
  PayrollManifestV1,
} from "@/lib/payroll/commitment-types";
import { DOMAIN_FELTS, hashLocalText, poseidonHash } from "@/lib/payroll/hashing";
import { buildMerkleTree, createMerkleProof, verifyMerkleProof } from "@/lib/payroll/merkle";
import type { ValidatedPayrollRow } from "@/lib/payroll/types";

export const MAX_U128 = (1n << 128n) - 1n;
const MAX_248_BIT_SALT = (1n << 248n) - 1n;

export class CommitmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommitmentError";
  }
}

function normalizeAddress(value: string, label: string): `0x${string}` {
  try {
    const normalized = validateAndParseAddress(value.trim()) as `0x${string}`;
    if (BigInt(normalized) === 0n) throw new Error("zero");
    return normalized;
  } catch {
    throw new CommitmentError(`${label} must be a non-zero Starknet address.`);
  }
}

function requireFelt(value: bigint, label: string): void {
  if (value < 0n || value >= (1n << 251n)) {
    throw new CommitmentError(`${label} is outside the supported felt range.`);
  }
}

export function computeRunId(input: {
  organization: bigint;
  periodHash: bigint;
  nonce: bigint;
}): bigint {
  requireFelt(input.organization, "Organization");
  requireFelt(input.periodHash, "Period hash");
  requireFelt(input.nonce, "Organization run nonce");
  return poseidonHash([
    DOMAIN_FELTS.RUN,
    input.organization,
    input.periodHash,
    input.nonce,
  ]);
}

export function computePayrollLeaf(entry: PayrollEntryV1, runId: bigint): bigint {
  if (!Number.isSafeInteger(entry.index) || entry.index < 0) {
    throw new CommitmentError("Entry index must be a non-negative safe integer.");
  }
  if (entry.amount <= 0n || entry.amount > MAX_U128) {
    throw new CommitmentError("Entry amount must fit an unsigned 128-bit integer.");
  }
  requireFelt(entry.periodHash, "Period hash");
  requireFelt(entry.memoHash, "Memo hash");
  requireFelt(entry.salt, "Salt");

  return poseidonHash([
    DOMAIN_FELTS.LEAF,
    runId,
    BigInt(entry.index),
    BigInt(entry.recipient),
    BigInt(entry.token),
    entry.amount,
    entry.periodHash,
    entry.memoHash,
    entry.salt,
  ]);
}

export function buildPayrollTree(entries: readonly PayrollEntryV1[], runId: bigint) {
  if (entries.length === 0) throw new CommitmentError("At least one payroll entry is required.");
  const canonicalEntries = [...entries].sort((left, right) => left.index - right.index);
  const seenIndices = new Set<number>();
  const seenRecipients = new Set<bigint>();
  canonicalEntries.forEach((entry) => {
    if (seenIndices.has(entry.index)) throw new CommitmentError("Duplicate payroll entry index.");
    const recipient = BigInt(entry.recipient);
    if (seenRecipients.has(recipient)) throw new CommitmentError("Duplicate recipient in commitment.");
    seenIndices.add(entry.index);
    seenRecipients.add(recipient);
  });
  const leaves = canonicalEntries.map((entry) => computePayrollLeaf(entry, runId));
  const tree = buildMerkleTree(leaves);
  const proofs = leaves.map((_, index) => createMerkleProof(tree, index));
  return { entries: canonicalEntries, leaves, proofs, merkleRoot: tree.root };
}

export function canonicalizeManifest(manifest: PayrollManifestV1): string {
  return JSON.stringify({
    schema: manifest.schema,
    network: manifest.network,
    runId: manifest.runId,
    token: manifest.token,
    tokenDecimals: manifest.tokenDecimals,
    aggregateAmount: manifest.aggregateAmount,
    recipientCount: manifest.recipientCount,
    periodHash: manifest.periodHash,
    merkleRoot: manifest.merkleRoot,
    hashAlgorithm: manifest.hashAlgorithm,
    leafVersion: manifest.leafVersion,
    createdAt: manifest.createdAt,
  });
}

export function computeManifestHash(canonicalManifest: string): bigint {
  return poseidonHash([
    DOMAIN_FELTS.MANIFEST,
    hashLocalText(canonicalManifest),
  ]);
}

export function randomSalt248(): bigint {
  const bytes = crypto.getRandomValues(new Uint8Array(31));
  let salt = 0n;
  for (const byte of bytes) salt = (salt << 8n) | BigInt(byte);
  if (salt === 0n) return randomSalt248();
  return salt;
}

export function generateUniqueSalts(count: number): bigint[] {
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new CommitmentError("Salt count must be a positive safe integer.");
  }
  const salts = new Set<bigint>();
  while (salts.size < count) salts.add(randomSalt248());
  return [...salts];
}

export function buildPayrollCommitment(input: {
  rows: readonly ValidatedPayrollRow[];
  organization: string;
  organizationRunNonce: bigint;
  token: string;
  tokenDecimals: number;
  period: string;
  createdAt: string;
  salts?: readonly bigint[];
}): PayrollCommitment {
  if (input.rows.length === 0) throw new CommitmentError("At least one payroll row is required.");
  if (!Number.isSafeInteger(input.tokenDecimals) || input.tokenDecimals < 0) {
    throw new CommitmentError("Token decimals are invalid.");
  }

  const organization = normalizeAddress(input.organization, "Organization");
  const token = normalizeAddress(input.token, "Token");
  const period = input.period.trim().normalize("NFC");
  if (period.length === 0 || period.length > 80) {
    throw new CommitmentError("Payroll period must be between 1 and 80 characters.");
  }
  if (new Date(input.createdAt).toISOString() !== input.createdAt) {
    throw new CommitmentError("Creation time must be a canonical ISO timestamp.");
  }

  const periodHash = hashLocalText(period);
  const runId = computeRunId({
    organization: BigInt(organization),
    periodHash,
    nonce: input.organizationRunNonce,
  });
  const salts = input.salts ? [...input.salts] : generateUniqueSalts(input.rows.length);
  if (salts.length !== input.rows.length || new Set(salts).size !== salts.length) {
    throw new CommitmentError("Every payroll row requires one unique salt.");
  }
  salts.forEach((salt) => {
    if (salt <= 0n || salt > MAX_248_BIT_SALT) {
      throw new CommitmentError("Every salt must be a non-zero 248-bit integer.");
    }
  });

  const seenRecipients = new Set<string>();
  let aggregateAmount = 0n;
  const entries: PayrollEntryV1[] = input.rows.map((row, index) => {
    const recipient = normalizeAddress(row.normalizedRecipient, "Recipient");
    if (seenRecipients.has(recipient)) throw new CommitmentError("Duplicate recipient in commitment.");
    seenRecipients.add(recipient);
    if (row.amountUnits <= 0n || row.amountUnits > MAX_U128) {
      throw new CommitmentError("Every amount must fit an unsigned 128-bit integer.");
    }
    aggregateAmount += row.amountUnits;
    return {
      index,
      recipient,
      token,
      amount: row.amountUnits,
      periodHash,
      memoHash: hashLocalText(row.memo),
      salt: salts[index] as bigint,
    };
  });
  if (aggregateAmount > MAX_U128) {
    throw new CommitmentError("Aggregate amount must fit an unsigned 128-bit integer.");
  }

  const payrollTree = buildPayrollTree(entries, runId);
  if (!payrollTree.leaves.every((leaf, index) => verifyMerkleProof(
    leaf,
    payrollTree.proofs[index]!,
    payrollTree.merkleRoot,
  ))) {
    throw new CommitmentError("Generated Merkle proof failed self-verification.");
  }

  const manifest: PayrollManifestV1 = {
    schema: "shadowledger/payroll-manifest/v1",
    network: "SN_MAIN",
    runId: num.toHex(runId) as `0x${string}`,
    token: num.toHex(BigInt(token)) as `0x${string}`,
    tokenDecimals: input.tokenDecimals,
    aggregateAmount: aggregateAmount.toString(10),
    recipientCount: entries.length,
    periodHash: num.toHex(periodHash) as `0x${string}`,
    merkleRoot: num.toHex(payrollTree.merkleRoot) as `0x${string}`,
    hashAlgorithm: "poseidon",
    leafVersion: 1,
    createdAt: input.createdAt,
  };
  const canonicalManifest = canonicalizeManifest(manifest);

  return {
    runId,
    periodHash,
    entries: payrollTree.entries,
    leaves: payrollTree.leaves,
    proofs: payrollTree.proofs,
    merkleRoot: payrollTree.merkleRoot,
    manifest,
    canonicalManifest,
    manifestHash: computeManifestHash(canonicalManifest),
  };
}
