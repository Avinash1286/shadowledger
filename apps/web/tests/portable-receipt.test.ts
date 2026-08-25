import { describe, expect, it } from "vitest";

import { buildPayrollCommitment } from "../lib/payroll/commitment";
import type { ValidatedPayrollRow } from "../lib/payroll/types";
import {
  assembleUnsignedPortableReceipt,
  buildReceiptTypedData,
  receiptSigningPayload,
  verifyPortableReceiptLocally,
  type PortableReceiptV1,
} from "../lib/receipts/portable";

const rows: ValidatedPayrollRow[] = [10, 11, 12].map((recipient, index) => ({
  id: String(index),
  rowNumber: index + 1,
  recipient: `0x${recipient}`,
  amount: String(index + 1),
  normalizedRecipient: `0x${recipient}` as `0x${string}`,
  amountUnits: BigInt(index + 1),
  memo: `Role ${index + 1}`,
}));

function fixture() {
  const commitment = buildPayrollCommitment({
    rows,
    organization: "0xabc",
    organizationRunNonce: 1n,
    token: "0x123",
    tokenDecimals: 18,
    period: "2026-08",
    createdAt: "2026-08-24T00:00:00.000Z",
    salts: [1n, 2n, 3n],
  });
  const unsigned = assembleUnsignedPortableReceipt({
    commitment,
    rows,
    index: 1,
    payer: "0xabc",
    registryAddress: "0x456",
    strk20TxHash: "0x789",
    period: "2026-08",
  });
  return { ...unsigned, attestation: { scheme: "SNIP-12", signedAt: "2026-08-24T00:01:00.000Z", signature: ["0x1", "0x2"] } } as PortableReceiptV1;
}

describe("portable recipient receipt", () => {
  it("recomputes a disclosed line and its Merkle proof", () => {
    const receipt = fixture();
    const report = verifyPortableReceiptLocally(receipt);
    expect(report.valid).toBe(true);
    expect(report.checks.every((check) => check.ok)).toBe(true);
  });

  it("binds the payer signature to run, payment, root, manifest, and transaction", () => {
    const typed = buildReceiptTypedData(receiptSigningPayload(fixture()));
    expect(typed.message).toMatchObject({
      payer: "0xabc",
      recipient: "0x11",
      amount: "2",
      strk20TxHash: "0x789",
    });
  });

  it("fails when a recipient changes the amount, memo, salt, or proof", () => {
    const base = fixture();
    const mutations: PortableReceiptV1[] = [
      { ...base, payment: { ...base.payment, amount: "3" } },
      { ...base, payment: { ...base.payment, memo: "Changed" } },
      { ...base, payment: { ...base.payment, salt: "0x9" } },
      { ...base, payment: { ...base.payment, siblings: ["0x9", ...base.payment.siblings.slice(1)] } },
    ];
    mutations.forEach((receipt) => expect(verifyPortableReceiptLocally(receipt).valid).toBe(false));
  });
});
