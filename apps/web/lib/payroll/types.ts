export type PayrollField = "file" | "recipient" | "amount" | "memo" | "total";

export type PayrollDraftRow = {
  id: string;
  recipient: string;
  amount: string;
  memo: string;
};

export type ValidatedPayrollRow = PayrollDraftRow & {
  rowNumber: number;
  normalizedRecipient: `0x${string}`;
  amountUnits: bigint;
};

export type PayrollValidationError = {
  rowNumber?: number;
  field: PayrollField;
  message: string;
};

export type PayrollValidationResult = {
  rows: ValidatedPayrollRow[];
  errors: PayrollValidationError[];
  totalUnits: bigint;
};
