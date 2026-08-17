import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { parsePayrollCsv } from "../lib/payroll/csv";
import {
  assertNoPlaintextPayrollPayload,
  PlaintextPayrollPayloadError,
} from "../lib/payroll/privacy";
import { validatePayrollRows } from "../lib/payroll/validation";

const DECIMALS = 18;

describe("payroll CSV", () => {
  it("imports the three-row demo fixture and totals exact base units", () => {
    const fixture = readFileSync(resolve(process.cwd(), "public/demo-payroll.csv"), "utf8");
    const result = parsePayrollCsv(fixture, DECIMALS);

    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(3);
    expect(result.totalUnits).toBe(4_250_000_000_000_000n);
    expect(result.rows[0]?.memo).toBe("Engineering, August");
  });

  it("normalizes trimmed, case-insensitive headers", () => {
    const result = parsePayrollCsv(" Recipient , AMOUNT , Memo\n0x1,1.25,Design", DECIMALS);

    expect(result.errors).toEqual([]);
    expect(result.rows[0]?.amountUnits).toBe(1_250_000_000_000_000_000n);
  });

  it.each([
    ["recipient,amount\n0x1,1e3", "Enter a positive decimal amount."],
    ["recipient,amount\n0x1,-1", "Enter a positive decimal amount."],
    ["recipient,amount\n0x1,0", "Amount must be greater than zero."],
    ["recipient,amount\n0x1,0.0000000000000000001", "Use no more than 18 decimal places."],
  ])("rejects unsafe decimal input", (csv, message) => {
    expect(parsePayrollCsv(csv, DECIMALS).errors).toContainEqual({
      rowNumber: 2,
      field: "amount",
      message,
    });
  });

  it("rejects equivalent duplicate addresses", () => {
    const result = parsePayrollCsv("recipient,amount\n0x1,1\n0x0001,2", DECIMALS);

    expect(result.errors).toContainEqual({
      rowNumber: 3,
      field: "recipient",
      message: "Duplicate recipient (first used on CSV row 2).",
    });
  });

  it("rejects zero and malformed addresses", () => {
    const result = parsePayrollCsv("recipient,amount\n0x0,1\nnot-an-address,2", DECIMALS);
    expect(result.errors.filter((error) => error.field === "recipient")).toHaveLength(2);
  });

  it.each([
    ["amount,memo\n1,missing", "Missing required column: recipient."],
    ["recipient,recipient,amount\n0x1,0x2,1", "CSV headers must not be duplicated."],
    ["recipient,amount,email\n0x1,1,a@example.com", "Unsupported column: email."],
  ])("rejects an unsafe schema", (csv, message) => {
    expect(parsePayrollCsv(csv, DECIMALS).errors).toContainEqual({ field: "file", message });
  });

  it("rejects rows with missing or extra columns", () => {
    expect(parsePayrollCsv("recipient,amount,memo\n0x1,1", DECIMALS).errors)
      .toContainEqual({
        rowNumber: 2,
        field: "file",
        message: "Expected 3 columns but found 2.",
      });
    expect(parsePayrollCsv("recipient,amount\n0x1,1,unexpected", DECIMALS).errors)
      .toContainEqual({
        rowNumber: 2,
        field: "file",
        message: "Expected 2 columns but found 3.",
      });
  });
});

describe("manual payroll rows", () => {
  it("calculates an exact aggregate", () => {
    const result = validatePayrollRows([
      { id: "1", recipient: "0x1", amount: "1.1", memo: "A" },
      { id: "2", recipient: "0x2", amount: "2.25", memo: "B" },
    ], DECIMALS);

    expect(result.errors).toEqual([]);
    expect(result.totalUnits).toBe(3_350_000_000_000_000_000n);
  });
});

describe("payroll privacy guard", () => {
  it("allows public commitment metadata", () => {
    expect(() => assertNoPlaintextPayrollPayload({ root: "0x123", count: 3, total: "0x456" }))
      .not.toThrow();
  });

  it.each(["recipient", "amount", "memo", "salt"])(
    "rejects nested plaintext field %s",
    (key) => {
      expect(() => assertNoPlaintextPayrollPayload({ nested: [{ [key]: "private" }] }))
        .toThrow(PlaintextPayrollPayloadError);
    },
  );
});
