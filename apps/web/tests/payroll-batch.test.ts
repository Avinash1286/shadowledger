import { describe, expect, it } from "vitest";

import type { PayrollEntryV1 } from "../lib/payroll/commitment-types";
import { assessExactBatchFunding, buildPayrollBatch } from "../lib/strk20/payroll-batch";

const TOKEN = "0x123" as const;
const entries: PayrollEntryV1[] = [1n, 2n, 3n].map((amount, index) => ({
  index,
  recipient: `0x${index + 10}` as `0x${string}`,
  token: TOKEN,
  amount,
  periodHash: 4n,
  memoHash: 5n,
  salt: BigInt(index + 1),
}));

describe("STRK20 payroll batches", () => {
  it("maps a three-recipient run to one ordered action array", () => {
    const batch = buildPayrollBatch(entries);
    expect(batch.aggregateAmount).toBe(6n);
    expect(batch.recipientCount).toBe(3);
    expect(batch.actions).toEqual([
      { type: "transfer", token: TOKEN, amount: "0x1", recipient: "0x0000000000000000000000000000000000000000000000000000000000000010" },
      { type: "transfer", token: TOKEN, amount: "0x2", recipient: "0x0000000000000000000000000000000000000000000000000000000000000011" },
      { type: "transfer", token: TOKEN, amount: "0x3", recipient: "0x0000000000000000000000000000000000000000000000000000000000000012" },
    ]);
  });

  it("enforces the three-to-five recipient privacy batch", () => {
    expect(() => buildPayrollBatch(entries.slice(0, 2))).toThrow("3–5");
    expect(() => buildPayrollBatch([...entries, ...entries.map((entry, index) => ({
      ...entry,
      index: index + 3,
      recipient: `0x${index + 20}` as `0x${string}`,
    }))])).toThrow("3–5");
  });

  it("rejects mixed tokens and duplicate recipients", () => {
    expect(() => buildPayrollBatch(entries.map((entry, index) => index === 2
      ? { ...entry, token: "0x456" as const }
      : entry))).toThrow("same token");
    expect(() => buildPayrollBatch(entries.map((entry, index) => index === 2
      ? { ...entry, recipient: entries[0]!.recipient }
      : entry))).toThrow("duplicate recipients");
  });

  it("reports exact private-balance readiness and shortfall", () => {
    expect(assessExactBatchFunding(6n, 6n)).toMatchObject({ ready: true, shortfall: 0n });
    expect(assessExactBatchFunding(6n, 4n)).toMatchObject({ ready: false, shortfall: 2n });
    expect(assessExactBatchFunding(6n, null)).toMatchObject({ ready: false, available: null });
  });
});
