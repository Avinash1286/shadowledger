# Integration guide

## Commitment library

The workspace package `@shadowledger/payroll-core` has no Next.js dependency. It exports `createPayrollCommitment`, low-level Poseidon and Merkle helpers, manifest canonicalization, proof generation, and proof verification.

```ts
import { createPayrollCommitment } from "@shadowledger/payroll-core";

const result = createPayrollCommitment({
  rows: [{ recipient: "0x11", amountUnits: 10n, memo: "Demo" }],
  organization: "0xabc",
  organizationRunNonce: 1n,
  token: "0x123",
  tokenDecimals: 18,
  period: "2026-08",
  createdAt: new Date().toISOString(),
});
```

All amounts are integer token base units. Addresses are canonicalized as Starknet addresses. `createdAt` must be canonical ISO-8601. Supply your own unique non-zero 248-bit salts for reproducible fixtures; omit them for Web Crypto randomness.

## Public manifest

Persist or publish only `result.manifest` and `result.manifestHash`. Never serialize `entries`, `leaves`, `proofs`, input rows, or salts to a public service. The exact v1 format and domain separators are in [RECEIPT_SPEC.md](./RECEIPT_SPEC.md).

## Wallet execution

The web adapter is intentionally separate from the core library. Integrators must enforce:

- `SN_MAIN` immediately before each action;
- Wallet API `0.10.3+` and the required STRK20 capabilities;
- exact-input simulation before approval;
- no public-transfer fallback;
- accepted-success receipt plus an event from the configured STRK20 pool.

## Local development

```bash
pnpm install
pnpm --filter @shadowledger/payroll-core test
pnpm --filter @shadowledger/payroll-core build
```

The package README contains a minimal proof-verification example. The web app and Cairo registry remain separate consumers so the commitment format can be reused in other payroll, grant, or treasury interfaces.
