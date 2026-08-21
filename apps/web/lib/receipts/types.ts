export type RecipientReceiptV1 = {
  schema: "shadowledger/recipient-receipt/v1";
  runId: `0x${string}`;
  recipient: `0x${string}`;
  token: `0x${string}`;
  amount: string;
  period: string;
  memo?: string;
  merkleProof: {
    leaf: `0x${string}`;
    siblings: `0x${string}`[];
    directions: ("left" | "right")[];
  };
};

export type EncryptedReceiptBlobV1 = {
  schema: "shadowledger/encrypted-receipt/v1";
  algorithm: "AES-256-GCM";
  blobId: string;
  runId: `0x${string}`;
  iv: string;
  ciphertext: string;
};

export type ClaimSecret = {
  blob: EncryptedReceiptBlobV1;
  key: string;
};

export type EncryptedRecoveryBundleV1 = {
  schema: "shadowledger/encrypted-recovery/v1";
  algorithm: "AES-256-GCM";
  bundleId: string;
  iv: string;
  ciphertext: string;
};

export type RecoveryBundleSecret = {
  bundle: EncryptedRecoveryBundleV1;
  key: string;
};
