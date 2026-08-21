import { hash, num, type RpcProvider } from "starknet";

import { addressesEqual } from "@/lib/strk20/address";
import {
  assertSessionIsStillOnMainnet,
  type PrivacyWalletSession,
} from "@/lib/strk20/client";

export const REGISTRY_STATUS = {
  missing: 0,
  created: 1,
  finalized: 2,
  cancelled: 3,
} as const;

export type RegistryStatus = (typeof REGISTRY_STATUS)[keyof typeof REGISTRY_STATUS];

export type PayrollRegistryRun = {
  runId: `0x${string}`;
  owner: `0x${string}`;
  token: `0x${string}`;
  aggregateAmount: bigint;
  recipientCount: number;
  periodHash: `0x${string}`;
  merkleRoot: `0x${string}`;
  manifestHash: `0x${string}`;
  strk20TxHash: `0x${string}`;
  createdAt: number;
  finalizedAt: number;
  status: RegistryStatus;
};

export type CreateRunInput = {
  runId: bigint;
  token: `0x${string}`;
  aggregateAmount: bigint;
  recipientCount: number;
  periodHash: bigint;
  merkleRoot: bigint;
  manifestHash: bigint;
};

export type VerifiedRegistryTransaction = {
  transactionHash: string;
  eventName: "PayrollRunCreated" | "PayrollRunFinalized" | "PayrollRunCancelled";
  run: PayrollRegistryRun;
};

function asHex(value: string | bigint): `0x${string}` {
  return num.toHex(BigInt(value)) as `0x${string}`;
}

function safeNumber(value: string): number {
  const parsed = BigInt(value);
  if (parsed > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Registry value exceeds the safe integer range.");
  return Number(parsed);
}

export function decodePayrollRun(runId: bigint, values: readonly string[]): PayrollRegistryRun {
  if (values.length !== 11) throw new Error("The registry returned a malformed payroll run.");
  const status = safeNumber(values[10]!);
  if (status < 0 || status > 3) throw new Error("The registry returned an unknown run status.");

  return {
    runId: asHex(runId),
    owner: asHex(values[0]!),
    token: asHex(values[1]!),
    aggregateAmount: BigInt(values[2]!),
    recipientCount: safeNumber(values[3]!),
    periodHash: asHex(values[4]!),
    merkleRoot: asHex(values[5]!),
    manifestHash: asHex(values[6]!),
    strk20TxHash: asHex(values[7]!),
    createdAt: safeNumber(values[8]!),
    finalizedAt: safeNumber(values[9]!),
    status: status as RegistryStatus,
  };
}

export async function readRegistryRun(input: {
  provider: RpcProvider;
  registryAddress: `0x${string}`;
  runId: bigint;
}): Promise<PayrollRegistryRun> {
  const values = await input.provider.callContract({
    contractAddress: input.registryAddress,
    entrypoint: "get_run",
    calldata: [num.toHex(input.runId)],
  });
  return decodePayrollRun(input.runId, values);
}

type ReceiptEvent = { from_address: string; keys: readonly string[] };

function receiptEvents(receipt: unknown): readonly ReceiptEvent[] {
  if (!receipt || typeof receipt !== "object") return [];
  const unwrapped = "value" in receipt ? (receipt as { value?: unknown }).value : receipt;
  if (!unwrapped || typeof unwrapped !== "object" || !("events" in unwrapped)) return [];
  const events = (unwrapped as { events?: unknown }).events;
  return Array.isArray(events) ? events as ReceiptEvent[] : [];
}

export function hasRegistryEvent(
  receipt: unknown,
  registryAddress: string,
  eventName: VerifiedRegistryTransaction["eventName"],
  runId: bigint,
): boolean {
  const selector = hash.getSelectorFromName(eventName);
  return receiptEvents(receipt).some((event) =>
    addressesEqual(event.from_address, registryAddress)
    && event.keys.length >= 2
    && BigInt(event.keys[0]!) === BigInt(selector)
    && BigInt(event.keys[1]!) === runId,
  );
}

async function executeAndVerify(input: {
  session: PrivacyWalletSession;
  registryAddress: `0x${string}`;
  entrypoint: "create_run" | "finalize_run" | "cancel_run";
  calldata: string[];
  runId: bigint;
  eventName: VerifiedRegistryTransaction["eventName"];
  expectedStatus: RegistryStatus;
}): Promise<VerifiedRegistryTransaction> {
  const account = await assertSessionIsStillOnMainnet(input.session);
  const result = await account.execute({
    contractAddress: input.registryAddress,
    entrypoint: input.entrypoint,
    calldata: input.calldata,
  });
  const receipt = await input.session.provider.waitForTransaction(result.transaction_hash);
  if (!hasRegistryEvent(receipt, input.registryAddress, input.eventName, input.runId)) {
    throw new Error(`Confirmed transaction did not emit ${input.eventName}.`);
  }
  const run = await readRegistryRun({
    provider: input.session.provider,
    registryAddress: input.registryAddress,
    runId: input.runId,
  });
  if (run.status !== input.expectedStatus) throw new Error("Registry state did not match the confirmed event.");
  return { transactionHash: result.transaction_hash, eventName: input.eventName, run };
}

export function createRunCalldata(input: CreateRunInput): string[] {
  if (input.aggregateAmount <= 0n) throw new Error("Aggregate amount must be positive.");
  if (!Number.isInteger(input.recipientCount) || input.recipientCount < 1 || input.recipientCount > 5) {
    throw new Error("Recipient count must be between 1 and 5.");
  }
  return [
    input.runId,
    input.token,
    input.aggregateAmount,
    input.recipientCount,
    input.periodHash,
    input.merkleRoot,
    input.manifestHash,
  ].map((value) => num.toHex(value));
}

export async function createRegistryRun(input: {
  session: PrivacyWalletSession;
  registryAddress: `0x${string}`;
  run: CreateRunInput;
}): Promise<VerifiedRegistryTransaction> {
  return executeAndVerify({
    session: input.session,
    registryAddress: input.registryAddress,
    entrypoint: "create_run",
    calldata: createRunCalldata(input.run),
    runId: input.run.runId,
    eventName: "PayrollRunCreated",
    expectedStatus: REGISTRY_STATUS.created,
  });
}

export async function finalizeRegistryRun(input: {
  session: PrivacyWalletSession;
  registryAddress: `0x${string}`;
  runId: bigint;
  strk20TxHash: bigint;
}): Promise<VerifiedRegistryTransaction> {
  return executeAndVerify({
    ...input,
    entrypoint: "finalize_run",
    calldata: [num.toHex(input.runId), num.toHex(input.strk20TxHash)],
    eventName: "PayrollRunFinalized",
    expectedStatus: REGISTRY_STATUS.finalized,
  });
}

export async function cancelRegistryRun(input: {
  session: PrivacyWalletSession;
  registryAddress: `0x${string}`;
  runId: bigint;
}): Promise<VerifiedRegistryTransaction> {
  return executeAndVerify({
    ...input,
    entrypoint: "cancel_run",
    calldata: [num.toHex(input.runId)],
    eventName: "PayrollRunCancelled",
    expectedStatus: REGISTRY_STATUS.cancelled,
  });
}

export const registryStatusLabel = (status: RegistryStatus): string =>
  ["Missing", "Created", "Finalized", "Cancelled"][status] ?? "Unknown";
