# `@shadowledger/payroll-core`

Framework-agnostic TypeScript primitives for producing ShadowLedger v1 Poseidon payroll commitments and recipient Merkle proofs.

```ts
import { createPayrollCommitment, verifyMerkleProof } from "@shadowledger/payroll-core";

const commitment = createPayrollCommitment({
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
  createdAt: new Date().toISOString(),
});

verifyMerkleProof(commitment.leaves[0]!, commitment.proofs[0]!, commitment.merkleRoot);
```

The library never uploads rows, memos, recipients, or salts. Callers own secure local storage and receipt delivery. See the repository integration guide for the complete data model and trust assumptions.
