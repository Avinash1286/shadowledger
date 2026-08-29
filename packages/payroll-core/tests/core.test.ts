import { describe, expect, it } from "vitest";
import { createPayrollCommitment, verifyMerkleProof } from "../src/index.js";

const input = {
  rows: [
    { recipient: "0x11", amountUnits: 10n, memo: "Engineering" },
    { recipient: "0x22", amountUnits: 20n, memo: "Design" },
    { recipient: "0x33", amountUnits: 30n, memo: "Operations" },
  ],
  organization: "0xabc",
  organizationRunNonce: 1n,
  token: "0x123",
  tokenDecimals: 18,
  period: "2026-08",
  createdAt: "2026-08-29T00:00:00.000Z",
  salts: [1n, 2n, 3n],
} as const;

describe("payroll core", () => {
  it("builds a deterministic aggregate commitment and valid proof for each recipient", () => {
    const result = createPayrollCommitment(input);
    expect(result.manifest.aggregateAmount).toBe("60");
    expect(result.manifest.recipientCount).toBe(3);
    expect(result.leaves.every((leaf, index) => verifyMerkleProof(leaf, result.proofs[index]!, result.merkleRoot))).toBe(true);
    expect(createPayrollCommitment(input).manifest).toEqual(result.manifest);
  });

  it("rejects duplicate recipients", () => {
    expect(() => createPayrollCommitment({ ...input, rows: [input.rows[0], input.rows[0], input.rows[2]] })).toThrow("Duplicate recipient");
  });
});
