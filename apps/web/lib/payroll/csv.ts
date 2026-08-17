import Papa from "papaparse";

import type { PayrollDraftRow, PayrollValidationResult } from "@/lib/payroll/types";
import { MAX_PAYROLL_ROWS, validatePayrollRows } from "@/lib/payroll/validation";

export const MAX_CSV_BYTES = 256 * 1024;
const ALLOWED_HEADERS = new Set(["recipient", "amount", "memo"]);
const REQUIRED_HEADERS = ["recipient", "amount"] as const;

function safeRowId(index: number): string {
  return `csv-row-${index + 1}`;
}

export function parsePayrollCsv(csvText: string, decimals: number): PayrollValidationResult {
  if (new TextEncoder().encode(csvText).byteLength > MAX_CSV_BYTES) {
    return {
      rows: [],
      totalUnits: 0n,
      errors: [{ field: "file", message: "CSV must be 256 KiB or smaller." }],
    };
  }

  const parsed = Papa.parse<string[]>(csvText, {
    skipEmptyLines: "greedy",
    dynamicTyping: false,
  });

  if (parsed.errors.length > 0) {
    return {
      rows: [],
      totalUnits: 0n,
      errors: parsed.errors.map((error) => ({
        rowNumber: typeof error.row === "number" ? error.row + 1 : undefined,
        field: "file" as const,
        message: `CSV syntax error: ${error.message}`,
      })),
    };
  }

  const [rawHeaders, ...dataRows] = parsed.data;
  if (!rawHeaders) {
    return {
      rows: [],
      totalUnits: 0n,
      errors: [{ field: "file", message: "CSV is empty." }],
    };
  }

  const headers = rawHeaders.map((header) => header.replace(/^\uFEFF/, "").trim().toLowerCase());
  const headerErrors: PayrollValidationResult["errors"] = [];
  const duplicateHeaders = headers.filter((header, index) => headers.indexOf(header) !== index);
  const unknownHeaders = headers.filter((header) => !ALLOWED_HEADERS.has(header));

  if (duplicateHeaders.length > 0) {
    headerErrors.push({ field: "file", message: "CSV headers must not be duplicated." });
  }
  if (unknownHeaders.length > 0) {
    headerErrors.push({
      field: "file",
      message: `Unsupported column: ${unknownHeaders[0] || "blank header"}.`,
    });
  }
  for (const required of REQUIRED_HEADERS) {
    if (!headers.includes(required)) {
      headerErrors.push({ field: "file", message: `Missing required column: ${required}.` });
    }
  }
  if (dataRows.length > MAX_PAYROLL_ROWS) {
    headerErrors.push({
      field: "file",
      message: `Payrolls are limited to ${MAX_PAYROLL_ROWS} rows in this build.`,
    });
  }
  dataRows.forEach((values, index) => {
    if (values.length !== headers.length) {
      headerErrors.push({
        rowNumber: index + 2,
        field: "file",
        message: `Expected ${headers.length} columns but found ${values.length}.`,
      });
    }
  });
  if (headerErrors.length > 0) {
    return { rows: [], totalUnits: 0n, errors: headerErrors };
  }

  const column = (name: string) => headers.indexOf(name);
  const drafts: PayrollDraftRow[] = dataRows.map((values, index) => ({
    id: safeRowId(index),
    recipient: values[column("recipient")]?.trim() ?? "",
    amount: values[column("amount")]?.trim() ?? "",
    memo: values[column("memo")]?.trim() ?? "",
  }));

  return validatePayrollRows(drafts, decimals);
}
