import { validateAndParseAddress } from "starknet";

import { parseTokenAmount } from "@/lib/strk20/amount";
import type {
  PayrollDraftRow,
  PayrollValidationError,
  PayrollValidationResult,
  ValidatedPayrollRow,
} from "@/lib/payroll/types";
import { MAX_U128 } from "@/lib/payroll/commitment";

export const MAX_PAYROLL_ROWS = 500;
export const MAX_MEMO_LENGTH = 160;

function normalizeRecipient(value: string): `0x${string}` | null {
  try {
    const normalized = validateAndParseAddress(value.trim()) as `0x${string}`;
    return BigInt(normalized) === 0n ? null : normalized;
  } catch {
    return null;
  }
}

export function validatePayrollRows(
  drafts: PayrollDraftRow[],
  decimals: number,
): PayrollValidationResult {
  const errors: PayrollValidationError[] = [];
  const rows: ValidatedPayrollRow[] = [];
  const seenRecipients = new Map<string, number>();
  let totalUnits = 0n;

  if (drafts.length === 0) {
    errors.push({ field: "file", message: "Add at least one payroll row." });
    return { rows, errors, totalUnits };
  }

  if (drafts.length > MAX_PAYROLL_ROWS) {
    errors.push({
      field: "file",
      message: `Payrolls are limited to ${MAX_PAYROLL_ROWS} rows in this build.`,
    });
  }

  drafts.slice(0, MAX_PAYROLL_ROWS).forEach((draft, index) => {
    const rowNumber = index + 2;
    const normalizedRecipient = normalizeRecipient(draft.recipient);
    let amountUnits: bigint | null = null;

    if (!normalizedRecipient) {
      errors.push({
        rowNumber,
        field: "recipient",
        message: "Enter a non-zero Starknet account address.",
      });
    } else {
      const duplicateRow = seenRecipients.get(normalizedRecipient);
      if (duplicateRow !== undefined) {
        errors.push({
          rowNumber,
          field: "recipient",
          message: `Duplicate recipient (first used on CSV row ${duplicateRow}).`,
        });
      } else {
        seenRecipients.set(normalizedRecipient, rowNumber);
      }
    }

    try {
      amountUnits = parseTokenAmount(draft.amount, decimals, MAX_U128);
    } catch (error) {
      errors.push({
        rowNumber,
        field: "amount",
        message: error instanceof Error ? error.message : "Enter a valid decimal amount.",
      });
    }

    const memo = draft.memo.trim();
    if (memo.length > MAX_MEMO_LENGTH) {
      errors.push({
        rowNumber,
        field: "memo",
        message: `Memo must be ${MAX_MEMO_LENGTH} characters or fewer.`,
      });
    }

    if (normalizedRecipient && amountUnits !== null && memo.length <= MAX_MEMO_LENGTH) {
      totalUnits += amountUnits;
      rows.push({
        ...draft,
        recipient: draft.recipient.trim(),
        amount: draft.amount.trim(),
        memo,
        rowNumber,
        normalizedRecipient,
        amountUnits,
      });
    }
  });

  if (totalUnits > MAX_U128) {
    errors.push({
      field: "total",
      message: "The aggregate exceeds the unsigned 128-bit commitment limit.",
    });
  }

  return { rows, errors, totalUnits };
}
