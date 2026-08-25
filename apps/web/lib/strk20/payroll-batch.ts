import type { STRK20_ACTION } from "@starknet-io/types-js";

import type { PayrollEntryV1 } from "@/lib/payroll/commitment-types";
import { MAX_U128 } from "@/lib/payroll/commitment";
import { SafeWalletError } from "@/lib/strk20/errors";
import { privateTransferAction } from "@/lib/strk20/private-transfer";

export const MIN_PAYROLL_BATCH_RECIPIENTS = 3;
export const MAX_PAYROLL_BATCH_RECIPIENTS = 5;

export type PayrollBatch = {
  actions: STRK20_ACTION[];
  aggregateAmount: bigint;
  token: `0x${string}`;
  recipientCount: number;
};

export function buildPayrollBatch(entries: readonly PayrollEntryV1[]): PayrollBatch {
  if (entries.length < MIN_PAYROLL_BATCH_RECIPIENTS || entries.length > MAX_PAYROLL_BATCH_RECIPIENTS) {
    throw new SafeWalletError(
      "INVALID_REQUEST_PAYLOAD",
      `A private payroll batch requires ${MIN_PAYROLL_BATCH_RECIPIENTS}–${MAX_PAYROLL_BATCH_RECIPIENTS} recipients.`,
    );
  }

  const token = entries[0]?.token;
  if (!token || entries.some((entry) => BigInt(entry.token) !== BigInt(token))) {
    throw new SafeWalletError("INVALID_REQUEST_PAYLOAD", "Every batch entry must use the same token.");
  }

  const recipients = new Set(entries.map((entry) => BigInt(entry.recipient).toString(16)));
  if (recipients.size !== entries.length) {
    throw new SafeWalletError("INVALID_RECIPIENT", "A payroll batch cannot contain duplicate recipients.");
  }

  const aggregateAmount = entries.reduce((total, entry) => total + entry.amount, 0n);
  if (aggregateAmount <= 0n || aggregateAmount > MAX_U128) {
    throw new SafeWalletError("INVALID_AMOUNT", "The exact batch total must fit an unsigned 128-bit integer.");
  }

  return {
    actions: entries.map((entry) => privateTransferAction({
      tokenAddress: token,
      recipient: entry.recipient,
      amount: entry.amount,
    })),
    aggregateAmount,
    token,
    recipientCount: entries.length,
  };
}

export type FundingAssessment = {
  required: bigint;
  available: bigint | null;
  shortfall: bigint;
  ready: boolean;
  note: string;
};

export function assessExactBatchFunding(required: bigint, available: bigint | null): FundingAssessment {
  if (required <= 0n) throw new SafeWalletError("INVALID_AMOUNT");
  if (available === null) {
    return {
      required,
      available,
      shortfall: 0n,
      ready: false,
      note: "Connect the wallet and refresh the private balance before simulation.",
    };
  }
  const shortfall = available >= required ? 0n : required - available;
  return {
    required,
    available,
    shortfall,
    ready: shortfall === 0n,
    note: shortfall === 0n
      ? "The private balance covers the exact payroll total. Network fees remain a separate wallet charge."
      : "Shield the displayed shortfall before simulating this batch.",
  };
}
