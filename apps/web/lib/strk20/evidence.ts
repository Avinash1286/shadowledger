import { addressesEqual } from "@/lib/strk20/address";

type ReceiptEvent = {
  from_address?: unknown;
};

type ReceiptLike = {
  execution_status?: unknown;
  finality_status?: unknown;
  events?: unknown;
};

export type PoolTransactionEvidence = {
  eligible: boolean;
  executionSucceeded: boolean;
  acceptedOnchain: boolean;
  poolEventFound: boolean;
};

export function assessPoolTransactionReceipt(
  receipt: unknown,
  poolAddress: string,
): PoolTransactionEvidence {
  const candidate =
    receipt && typeof receipt === "object" ? (receipt as ReceiptLike) : {};
  const events = Array.isArray(candidate.events)
    ? (candidate.events as ReceiptEvent[])
    : [];

  const executionSucceeded = candidate.execution_status === "SUCCEEDED";
  const acceptedOnchain =
    candidate.finality_status === "ACCEPTED_ON_L2" ||
    candidate.finality_status === "ACCEPTED_ON_L1";
  const poolEventFound = events.some(
    (event) =>
      typeof event?.from_address === "string" &&
      addressesEqual(event.from_address, poolAddress),
  );

  return {
    eligible: executionSucceeded && acceptedOnchain && poolEventFound,
    executionSucceeded,
    acceptedOnchain,
    poolEventFound,
  };
}
