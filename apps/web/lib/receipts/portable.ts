import { num, type RpcProvider, type Signature, type TypedData, TypedDataRevision } from "starknet";

import {
  canonicalizeManifest,
  computeManifestHash,
  computePayrollLeaf,
} from "@/lib/payroll/commitment";
import type { PayrollCommitment, PayrollManifestV1 } from "@/lib/payroll/commitment-types";
import type { ValidatedPayrollRow } from "@/lib/payroll/types";
import { verifyMerkleProof } from "@/lib/payroll/merkle";
import { hashLocalText } from "@/lib/payroll/hashing";
import type { PayrollRegistryRun } from "@/lib/registry/client";
import { addressesEqual, isStarknetAddress } from "@/lib/strk20/address";
import { assertSessionIsStillOnMainnet, type PrivacyWalletSession } from "@/lib/strk20/client";

export type PortableReceiptV1 = {
  schema: "shadowledger/portable-receipt/v1";
  network: "SN_MAIN";
  payer: `0x${string}`;
  registryAddress: `0x${string}`;
  strk20TxHash: `0x${string}`;
  manifest: PayrollManifestV1;
  manifestHash: `0x${string}`;
  payment: {
    index: number;
    recipient: `0x${string}`;
    token: `0x${string}`;
    amount: string;
    period: string;
    memo: string;
    salt: `0x${string}`;
    leaf: `0x${string}`;
    siblings: `0x${string}`[];
    directions: ("left" | "right")[];
  };
  attestation: {
    scheme: "SNIP-12";
    signedAt: string;
    signature: string[];
  };
};

export type ReceiptVerificationReport = {
  valid: boolean;
  checks: { name: string; ok: boolean; detail: string }[];
};

function hex(value: bigint | string): `0x${string}` {
  return num.toHex(BigInt(value)) as `0x${string}`;
}

export function buildReceiptTypedData(receipt: Omit<PortableReceiptV1, "attestation">): TypedData {
  return {
    types: {
      StarknetDomain: [
        { name: "name", type: "shortstring" },
        { name: "version", type: "shortstring" },
        { name: "chainId", type: "shortstring" },
        { name: "revision", type: "shortstring" },
      ],
      PayrollReceipt: [
        { name: "runId", type: "felt" },
        { name: "payer", type: "ContractAddress" },
        { name: "recipient", type: "ContractAddress" },
        { name: "token", type: "ContractAddress" },
        { name: "amount", type: "u128" },
        { name: "periodHash", type: "felt" },
        { name: "memoHash", type: "felt" },
        { name: "salt", type: "felt" },
        { name: "leaf", type: "felt" },
        { name: "merkleRoot", type: "felt" },
        { name: "manifestHash", type: "felt" },
        { name: "strk20TxHash", type: "felt" },
      ],
    },
    primaryType: "PayrollReceipt",
    domain: {
      name: "ShadowLedger",
      version: "1",
      chainId: "SN_MAIN",
      revision: TypedDataRevision.ACTIVE,
    },
    message: {
      runId: receipt.manifest.runId,
      payer: receipt.payer,
      recipient: receipt.payment.recipient,
      token: receipt.payment.token,
      amount: receipt.payment.amount,
      periodHash: receipt.manifest.periodHash,
      memoHash: hex(hashLocalText(receipt.payment.memo)),
      salt: receipt.payment.salt,
      leaf: receipt.payment.leaf,
      merkleRoot: receipt.manifest.merkleRoot,
      manifestHash: receipt.manifestHash,
      strk20TxHash: receipt.strk20TxHash,
    },
  };
}

export function receiptSigningPayload(receipt: PortableReceiptV1): Omit<PortableReceiptV1, "attestation"> {
  const { attestation, ...unsigned } = receipt;
  void attestation;
  return unsigned;
}

function signatureToStrings(signature: Signature): string[] {
  if (Array.isArray(signature)) return signature.map(String);
  if ("r" in signature && "s" in signature) return [hex(signature.r), hex(signature.s)];
  throw new Error("The wallet returned an unsupported signature shape.");
}

export function assembleUnsignedPortableReceipt(input: {
  commitment: PayrollCommitment;
  rows: readonly ValidatedPayrollRow[];
  index: number;
  payer: string;
  registryAddress: string;
  strk20TxHash: string;
  period: string;
}): Omit<PortableReceiptV1, "attestation"> {
  const entry = input.commitment.entries[input.index];
  const row = input.rows[input.index];
  const proof = input.commitment.proofs[input.index];
  const leaf = input.commitment.leaves[input.index];
  if (!entry || !row || !proof || leaf === undefined) throw new Error("Receipt index is outside this payroll run.");
  if (!isStarknetAddress(input.payer) || !isStarknetAddress(input.registryAddress)) {
    throw new Error("Payer and registry must be Starknet addresses.");
  }
  if (!/^0x[0-9a-f]+$/i.test(input.strk20TxHash)) throw new Error("STRK20 transaction hash is invalid.");

  return {
    schema: "shadowledger/portable-receipt/v1",
    network: "SN_MAIN",
    payer: hex(input.payer),
    registryAddress: hex(input.registryAddress),
    strk20TxHash: hex(input.strk20TxHash),
    manifest: input.commitment.manifest,
    manifestHash: hex(input.commitment.manifestHash),
    payment: {
      index: entry.index,
      recipient: hex(entry.recipient),
      token: hex(entry.token),
      amount: entry.amount.toString(10),
      period: input.period.trim().normalize("NFC"),
      memo: row.memo.trim().normalize("NFC"),
      salt: hex(entry.salt),
      leaf: hex(leaf),
      siblings: proof.siblings.map(hex),
      directions: proof.directions,
    },
  };
}

export async function signPortableReceipt(input: {
  session: PrivacyWalletSession;
  receipt: Omit<PortableReceiptV1, "attestation">;
  signedAt?: string;
}): Promise<PortableReceiptV1> {
  const account = await assertSessionIsStillOnMainnet(input.session);
  if (!addressesEqual(account.address, input.receipt.payer)) throw new Error("Connected wallet does not match the receipt payer.");
  const signature = await account.signMessage(buildReceiptTypedData(input.receipt));
  return {
    ...input.receipt,
    attestation: {
      scheme: "SNIP-12",
      signedAt: input.signedAt ?? new Date().toISOString(),
      signature: signatureToStrings(signature),
    },
  };
}

export function parsePortableReceipt(value: string): PortableReceiptV1 {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object") throw new Error("Receipt must be a JSON object.");
  const receipt = parsed as PortableReceiptV1;
  if (receipt.schema !== "shadowledger/portable-receipt/v1" || receipt.network !== "SN_MAIN") {
    throw new Error("Unsupported portable receipt schema or network.");
  }
  if (!receipt.manifest || !receipt.payment || !receipt.attestation || !Array.isArray(receipt.attestation.signature)) {
    throw new Error("Portable receipt is incomplete.");
  }
  return receipt;
}

export function verifyPortableReceiptLocally(receipt: PortableReceiptV1): ReceiptVerificationReport {
  const checks: ReceiptVerificationReport["checks"] = [];
  const check = (name: string, ok: boolean, detail: string) => checks.push({ name, ok, detail });
  try {
    const canonical = canonicalizeManifest(receipt.manifest);
    check("Manifest hash", computeManifestHash(canonical) === BigInt(receipt.manifestHash), "Canonical public manifest matches its Poseidon hash.");
    check("Run fields", addressesEqual(receipt.payment.token, receipt.manifest.token)
      && receipt.payment.amount.length > 0
      && receipt.manifest.runId.startsWith("0x"), "Payment token and run identifiers are internally consistent.");
    const entry = {
      index: receipt.payment.index,
      recipient: receipt.payment.recipient,
      token: receipt.payment.token,
      amount: BigInt(receipt.payment.amount),
      periodHash: hashLocalText(receipt.payment.period),
      memoHash: hashLocalText(receipt.payment.memo),
      salt: BigInt(receipt.payment.salt),
    };
    const computedLeaf = computePayrollLeaf(entry, BigInt(receipt.manifest.runId));
    check("Disclosed line", computedLeaf === BigInt(receipt.payment.leaf), "The disclosed row recomputes the signed leaf.");
    check("Merkle proof", verifyMerkleProof(computedLeaf, {
      siblings: receipt.payment.siblings.map(BigInt),
      directions: receipt.payment.directions,
    }, BigInt(receipt.manifest.merkleRoot)), "The leaf resolves to the public payroll root.");
    check("Period", entry.periodHash === BigInt(receipt.manifest.periodHash), "The disclosed period matches the committed period hash.");
    check("Signature present", receipt.attestation.signature.length >= 2, "A payer SNIP-12 signature is attached for online verification.");
  } catch (error) {
    check("Receipt decoding", false, error instanceof Error ? error.message : "Receipt values could not be decoded.");
  }
  return { valid: checks.length > 0 && checks.every((item) => item.ok), checks };
}

export function compareReceiptToRegistry(receipt: PortableReceiptV1, run: PayrollRegistryRun): ReceiptVerificationReport {
  const checks = [
    { name: "Registry run", ok: BigInt(run.runId) === BigInt(receipt.manifest.runId), detail: "Run ID matches registry state." },
    { name: "Registry root", ok: BigInt(run.merkleRoot) === BigInt(receipt.manifest.merkleRoot), detail: "Merkle root matches registry state." },
    { name: "Registry manifest", ok: BigInt(run.manifestHash) === BigInt(receipt.manifestHash), detail: "Manifest hash matches registry state." },
    { name: "Registry transaction", ok: BigInt(run.strk20TxHash) === BigInt(receipt.strk20TxHash), detail: "STRK20 transaction hash matches finalized registry state." },
    { name: "Registry totals", ok: run.aggregateAmount === BigInt(receipt.manifest.aggregateAmount) && run.recipientCount === receipt.manifest.recipientCount, detail: "Aggregate and recipient count match registry state." },
  ];
  return { valid: checks.every((item) => item.ok), checks };
}

export async function verifyReceiptSignature(provider: RpcProvider, receipt: PortableReceiptV1): Promise<boolean> {
  return provider.verifyMessageInStarknet(buildReceiptTypedData(receiptSigningPayload(receipt)), receipt.attestation.signature, receipt.payer);
}
