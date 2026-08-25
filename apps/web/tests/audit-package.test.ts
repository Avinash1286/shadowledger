import { describe, expect, it } from "vitest";

import { buildAuditPackage, verifyAuditPackage } from "../lib/audit/package";
import { buildPayrollCommitment } from "../lib/payroll/commitment";
import type { ValidatedPayrollRow } from "../lib/payroll/types";

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
  return buildAuditPackage(buildPayrollCommitment({
    rows,
    organization: "0xabc",
    organizationRunNonce: 1n,
    token: "0x123",
    tokenDecimals: 18,
    period: "2026-08",
    createdAt: "2026-08-25T00:00:00.000Z",
    salts: [1n, 2n, 3n],
  }));
}

describe("local auditor package", () => {
  it("reproduces the public root, total, count, token, period, and manifest hash", () => {
    const report = verifyAuditPackage(fixture());
    expect(report.valid).toBe(true);
    expect(report.recomputed).toMatchObject({ aggregateAmount: "6", recipientCount: 3 });
  });

  it("reports tampered private amounts and public metadata", () => {
    const amountTamper = fixture();
    amountTamper.entries[0]!.amount = "9";
    expect(verifyAuditPackage(amountTamper).valid).toBe(false);

    const rootTamper = fixture();
    rootTamper.manifest.merkleRoot = "0x1";
    expect(verifyAuditPackage(rootTamper).valid).toBe(false);

    const countTamper = fixture();
    countTamper.manifest.recipientCount = 4;
    expect(verifyAuditPackage(countTamper).valid).toBe(false);
  });
});
