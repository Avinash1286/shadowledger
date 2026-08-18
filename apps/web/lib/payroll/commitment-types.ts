export type PayrollEntryV1 = {
  index: number;
  recipient: `0x${string}`;
  token: `0x${string}`;
  amount: bigint;
  periodHash: bigint;
  memoHash: bigint;
  salt: bigint;
};

export type MerkleDirection = "left" | "right";

export type MerkleProof = {
  siblings: bigint[];
  directions: MerkleDirection[];
};

export type PayrollManifestV1 = {
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
  entries: PayrollEntryV1[];
  leaves: bigint[];
  proofs: MerkleProof[];
  merkleRoot: bigint;
  manifest: PayrollManifestV1;
  canonicalManifest: string;
  manifestHash: bigint;
};
