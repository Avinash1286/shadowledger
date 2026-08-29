import { hash, num, shortString, validateAndParseAddress } from "starknet";

export const DOMAIN_TAGS = {
  RUN: "SHADOWLEDGER_RUN_V1",
  LEAF: "SHADOWLEDGER_LEAF_V1",
  NODE: "SHADOWLEDGER_NODE_V1",
  MANIFEST: "SHADOWLEDGER_MANIFEST_V1",
  EMPTY_LEAF: "SHADOWLEDGER_EMPTY_LEAF_V1",
} as const;

export type MerkleDirection = "left" | "right";
export type MerkleProof = { siblings: bigint[]; directions: MerkleDirection[] };
export type PayrollInputRow = { recipient: string; amountUnits: bigint; memo?: string };
export type PayrollEntry = {
  index: number;
  recipient: `0x${string}`;
  token: `0x${string}`;
  amount: bigint;
  periodHash: bigint;
  memoHash: bigint;
  salt: bigint;
};
export type PayrollManifest = {
  schema: "shadowledger/payroll-manifest/v1";
  network: "SN_MAIN";
  runId: `0x${string}`;
  token: `0x${string}`;
  tokenDecimals: number;
  aggregateAmount: string;
  recipientCount: number;
  periodHash: `0x${string}`;
  merkleRoot: `0x${string}`;
  hashAlgorithm: "poseidon";
  leafVersion: 1;
  createdAt: string;
};
export type PayrollCommitment = {
  runId: bigint;
  periodHash: bigint;
  entries: PayrollEntry[];
  leaves: bigint[];
  proofs: MerkleProof[];
  merkleRoot: bigint;
  manifest: PayrollManifest;
  canonicalManifest: string;
  manifestHash: bigint;
};

export const MAX_U128 = (1n << 128n) - 1n;
const MAX_SALT = (1n << 248n) - 1n;
const FELT_LIMIT = 1n << 251n;

export class CommitmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommitmentError";
  }
}

export function asciiDomainFelt(tag: string): bigint {
  return BigInt(shortString.encodeShortString(tag));
}

export const DOMAIN_FELTS = {
  RUN: asciiDomainFelt(DOMAIN_TAGS.RUN),
  LEAF: asciiDomainFelt(DOMAIN_TAGS.LEAF),
  NODE: asciiDomainFelt(DOMAIN_TAGS.NODE),
  MANIFEST: asciiDomainFelt(DOMAIN_TAGS.MANIFEST),
  EMPTY_LEAF: asciiDomainFelt(DOMAIN_TAGS.EMPTY_LEAF),
} as const;

export function poseidonHash(values: readonly bigint[]): bigint {
  return BigInt(hash.computePoseidonHashOnElements([...values]));
}

export function hashLocalText(value: string): bigint {
  const canonical = value.trim().normalize("NFC");
  return canonical.length === 0 ? 0n : hash.starknetKeccak(canonical);
}

export const EMPTY_LEAF_V1 = poseidonHash([DOMAIN_FELTS.EMPTY_LEAF]);

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
  if (value < 0n || value >= FELT_LIMIT) throw new CommitmentError(`${label} is outside the supported felt range.`);
}

export function computeRunId(input: { organization: bigint; periodHash: bigint; nonce: bigint }): bigint {
  requireFelt(input.organization, "Organization");
  requireFelt(input.periodHash, "Period hash");
  requireFelt(input.nonce, "Organization run nonce");
  return poseidonHash([DOMAIN_FELTS.RUN, input.organization, input.periodHash, input.nonce]);
}

export function computePayrollLeaf(entry: PayrollEntry, runId: bigint): bigint {
  if (!Number.isSafeInteger(entry.index) || entry.index < 0) throw new CommitmentError("Entry index must be a non-negative safe integer.");
  if (entry.amount <= 0n || entry.amount > MAX_U128) throw new CommitmentError("Entry amount must fit an unsigned 128-bit integer.");
  requireFelt(entry.periodHash, "Period hash");
  requireFelt(entry.memoHash, "Memo hash");
  requireFelt(entry.salt, "Salt");
  return poseidonHash([DOMAIN_FELTS.LEAF, runId, BigInt(entry.index), BigInt(entry.recipient), BigInt(entry.token), entry.amount, entry.periodHash, entry.memoHash, entry.salt]);
}

function nextPowerOfTwo(value: number): number {
  let result = 1;
  while (result < value) result *= 2;
  return result;
}

export function hashMerkleNode(left: bigint, right: bigint): bigint {
  return poseidonHash([DOMAIN_FELTS.NODE, left, right]);
}

export function buildMerkleTree(leaves: readonly bigint[]) {
  if (leaves.length === 0) throw new CommitmentError("A Merkle tree requires at least one leaf.");
  const padded = [...leaves];
  while (padded.length < nextPowerOfTwo(leaves.length)) padded.push(EMPTY_LEAF_V1);
  const layers: bigint[][] = [padded];
  let current = padded;
  while (current.length > 1) {
    const next: bigint[] = [];
    for (let index = 0; index < current.length; index += 2) {
      const left = current[index];
      const right = current[index + 1];
      if (left === undefined || right === undefined) throw new CommitmentError("Merkle padding invariant failed.");
      next.push(hashMerkleNode(left, right));
    }
    layers.push(next);
    current = next;
  }
  return { root: current[0]!, layers, originalLeafCount: leaves.length };
}

export function createMerkleProof(tree: ReturnType<typeof buildMerkleTree>, leafIndex: number): MerkleProof {
  if (!Number.isSafeInteger(leafIndex) || leafIndex < 0 || leafIndex >= tree.originalLeafCount) throw new CommitmentError("Merkle proof index is out of range.");
  const siblings: bigint[] = [];
  const directions: MerkleDirection[] = [];
  let index = leafIndex;
  for (let level = 0; level < tree.layers.length - 1; level += 1) {
    const layer = tree.layers[level]!;
    const siblingIsLeft = index % 2 === 1;
    const sibling = layer[siblingIsLeft ? index - 1 : index + 1];
    if (sibling === undefined) throw new CommitmentError("Merkle sibling is missing.");
    siblings.push(sibling);
    directions.push(siblingIsLeft ? "left" : "right");
    index = Math.floor(index / 2);
  }
  return { siblings, directions };
}

export function verifyMerkleProof(leaf: bigint, proof: MerkleProof, expectedRoot: bigint): boolean {
  if (proof.siblings.length !== proof.directions.length) return false;
  let current = leaf;
  for (let index = 0; index < proof.siblings.length; index += 1) {
    const sibling = proof.siblings[index];
    const direction = proof.directions[index];
    if (sibling === undefined || direction === undefined) return false;
    current = direction === "left" ? hashMerkleNode(sibling, current) : hashMerkleNode(current, sibling);
  }
  return current === expectedRoot;
}

export function canonicalizeManifest(manifest: PayrollManifest): string {
  return JSON.stringify({
    schema: manifest.schema, network: manifest.network, runId: manifest.runId, token: manifest.token,
    tokenDecimals: manifest.tokenDecimals, aggregateAmount: manifest.aggregateAmount,
    recipientCount: manifest.recipientCount, periodHash: manifest.periodHash, merkleRoot: manifest.merkleRoot,
    hashAlgorithm: manifest.hashAlgorithm, leafVersion: manifest.leafVersion, createdAt: manifest.createdAt,
  });
}

export function computeManifestHash(canonicalManifest: string): bigint {
  return poseidonHash([DOMAIN_FELTS.MANIFEST, hashLocalText(canonicalManifest)]);
}

export function randomSalt248(): bigint {
  const bytes = crypto.getRandomValues(new Uint8Array(31));
  let salt = 0n;
  for (const byte of bytes) salt = (salt << 8n) | BigInt(byte);
  return salt === 0n ? randomSalt248() : salt;
}

export function createPayrollCommitment(input: {
  rows: readonly PayrollInputRow[];
  organization: string;
  organizationRunNonce: bigint;
  token: string;
  tokenDecimals: number;
  period: string;
  createdAt: string;
  salts?: readonly bigint[];
}): PayrollCommitment {
  if (input.rows.length === 0) throw new CommitmentError("At least one payroll row is required.");
  if (!Number.isSafeInteger(input.tokenDecimals) || input.tokenDecimals < 0) throw new CommitmentError("Token decimals are invalid.");
  const organization = normalizeAddress(input.organization, "Organization");
  const token = normalizeAddress(input.token, "Token");
  const period = input.period.trim().normalize("NFC");
  if (period.length === 0 || period.length > 80) throw new CommitmentError("Payroll period must be between 1 and 80 characters.");
  if (new Date(input.createdAt).toISOString() !== input.createdAt) throw new CommitmentError("Creation time must be a canonical ISO timestamp.");
  const periodHash = hashLocalText(period);
  const runId = computeRunId({ organization: BigInt(organization), periodHash, nonce: input.organizationRunNonce });
  const salts = input.salts ? [...input.salts] : input.rows.map(() => randomSalt248());
  if (salts.length !== input.rows.length || new Set(salts).size !== salts.length || salts.some((salt) => salt <= 0n || salt > MAX_SALT)) {
    throw new CommitmentError("Every payroll row requires one unique non-zero 248-bit salt.");
  }
  const recipients = new Set<string>();
  let aggregateAmount = 0n;
  const entries = input.rows.map((row, index): PayrollEntry => {
    const recipient = normalizeAddress(row.recipient, "Recipient");
    if (recipients.has(recipient)) throw new CommitmentError("Duplicate recipient in commitment.");
    recipients.add(recipient);
    if (row.amountUnits <= 0n || row.amountUnits > MAX_U128) throw new CommitmentError("Every amount must fit an unsigned 128-bit integer.");
    aggregateAmount += row.amountUnits;
    return { index, recipient, token, amount: row.amountUnits, periodHash, memoHash: hashLocalText(row.memo ?? ""), salt: salts[index]! };
  });
  if (aggregateAmount > MAX_U128) throw new CommitmentError("Aggregate amount must fit an unsigned 128-bit integer.");
  const leaves = entries.map((entry) => computePayrollLeaf(entry, runId));
  const tree = buildMerkleTree(leaves);
  const proofs = leaves.map((_, index) => createMerkleProof(tree, index));
  if (!leaves.every((leaf, index) => verifyMerkleProof(leaf, proofs[index]!, tree.root))) throw new CommitmentError("Generated Merkle proof failed self-verification.");
  const manifest: PayrollManifest = {
    schema: "shadowledger/payroll-manifest/v1", network: "SN_MAIN", runId: num.toHex(runId) as `0x${string}`,
    token: num.toHex(BigInt(token)) as `0x${string}`, tokenDecimals: input.tokenDecimals,
    aggregateAmount: aggregateAmount.toString(10), recipientCount: entries.length,
    periodHash: num.toHex(periodHash) as `0x${string}`, merkleRoot: num.toHex(tree.root) as `0x${string}`,
    hashAlgorithm: "poseidon", leafVersion: 1, createdAt: input.createdAt,
  };
  const canonicalManifest = canonicalizeManifest(manifest);
  return { runId, periodHash, entries, leaves, proofs, merkleRoot: tree.root, manifest, canonicalManifest, manifestHash: computeManifestHash(canonicalManifest) };
}
