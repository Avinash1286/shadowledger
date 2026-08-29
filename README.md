# ShadowLedger

**Private payroll, public aggregate accountability.** ShadowLedger lets an organization execute a 3–5 recipient STRK20 payroll from Ready while publishing only the total, count, token, and cryptographic commitment needed for verification.

[Live app](https://shadowledger-six.vercel.app) · [Registration](https://github.com/starkience/strk20-hackathon/pull/49) · Payments / RFP-11 · MIT

> Submission status: the application and submission package are code-complete. The root evidence file still needs three real, successful mainnet STRK20 pool transaction hashes and a public demo-video URL. Those human-approved artifacts are never fabricated or generated from Devnet evidence.

## Why it matters

Traditional on-chain payroll exposes every employee and amount. ShadowLedger uses STRK20 private transfers for payout, a salted Poseidon Merkle commitment for aggregate accountability, and recipient-specific signed receipts for selective verification.

| Public | Kept private |
| --- | --- |
| Payer, token, aggregate total, recipient count | Recipient addresses and individual amounts |
| Merkle root, manifest hash, run status | Memos, salts, Merkle paths |
| Eligible STRK20 transaction hash | Wallet secrets and viewing data |

## Demo flow

1. Connect a Ready mainnet account; ShadowLedger hard-fails on the wrong chain or missing STRK20 capabilities.
2. Import or enter 3–5 synthetic payroll rows locally. The browser validates exact base units and creates a salted Poseidon Merkle commitment.
3. Create the aggregate registry record, simulate the full private batch, approve it in Ready, confirm accepted pool evidence, and finalize the run.
4. Sign and encrypt recipient receipts. A recipient locally decrypts their claim and verifies their leaf, payer signature, registry state, and pool transaction.
5. A deliberately shared audit package can recompute the entire run offline and then be cleared from memory.

Useful routes: [`/dashboard`](https://shadowledger-six.vercel.app/dashboard), [`/payroll/new`](https://shadowledger-six.vercel.app/payroll/new), [`/recipient/activate`](https://shadowledger-six.vercel.app/recipient/activate), [`/verify`](https://shadowledger-six.vercel.app/verify), [`/auditor`](https://shadowledger-six.vercel.app/auditor), and [`/privacy`](https://shadowledger-six.vercel.app/privacy).

## Repository

```text
apps/web/                  Next.js 16 application and browser tests
packages/payroll-core/     Framework-agnostic commitment/Merkle library
contracts/                 Cairo PayrollRegistry and Foundry tests
docs/                      Architecture, privacy, threat model, runbooks
strk20.json                Official hackathon evidence manifest
```

The browser is the plaintext trust boundary. CSV rows, individual amounts, memos, salts, and claim keys are not sent to the application backend. Optional Convex storage receives only authenticated ciphertext. Claim keys stay after `#` in URLs and therefore are not included in HTTP requests.

## Run from a fresh clone

Requirements: Node.js 20.9+, pnpm 10, and Ready for wallet-gated mainnet operations.

```bash
git clone https://github.com/Avinash1286/shadowledger.git
cd shadowledger
pnpm install --frozen-lockfile
cp .env.example apps/web/.env.local
pnpm check
pnpm dev
```

On Windows PowerShell, replace the `cp` line with `Copy-Item .env.example apps/web/.env.local`. Open `http://localhost:3000`. The public defaults target `SN_MAIN`; add the registry and optional Convex values locally without committing secrets.

## Verification

```bash
pnpm check
pnpm submission:check
pnpm submission:check -- --strict
```

`pnpm check` runs lint, strict TypeScript, 100+ web and library tests, the package build, and the production Next.js build. Vercel runs the web lint/typecheck/test/build gate for every deployment; GitHub Actions is intentionally not required.

The non-strict submission check validates the evidence-file structure during development. Strict mode additionally requires at least three transaction hashes and the demo video.

Contract checks are documented in [`contracts/README.md`](./contracts/README.md). Local Devnet evidence in [`contracts/deployments/devnet.json`](./contracts/deployments/devnet.json) proves the registry workflow only; it is never represented as mainnet submission evidence.

## Security and privacy

- Browser-only parsing and recursive outgoing-payload privacy guard.
- Exact integer amounts, canonical addresses, duplicate detection, u128 limits.
- Domain-separated Poseidon run, leaf, node, and manifest hashes with unique 248-bit salts.
- `SN_MAIN` recheck and exact-input simulation before wallet approval; no public-transfer fallback.
- Accepted-success receipt and configured-pool-event validation.
- AES-256-GCM claim encryption with a random key/IV and blob/run authenticated data.
- SNIP-12 payer attestation, recipient match, Merkle proof, registry comparison, and explorer evidence.
- CSP and hardened response headers; sensitive routes are no-store, no-referrer, and noindex.

This is unaudited hackathon software, not production payroll infrastructure. Read the [privacy model](./docs/PRIVACY_MODEL.md), [threat model](./docs/THREAT_MODEL.md), and [security policy](./SECURITY.md) before using it.

## Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [Privacy model](./docs/PRIVACY_MODEL.md)
- [Threat model](./docs/THREAT_MODEL.md)
- [Receipt and commitment specification](./docs/RECEIPT_SPEC.md)
- [Reusable package integration](./docs/INTEGRATION_GUIDE.md)
- [Mainnet runbook](./docs/MAINNET_RUNBOOK.md)
- [Auditor mode](./docs/AUDITOR_MODE.md)
- [Three-minute demo script](./docs/DEMO_SCRIPT.md)
- [Security checklist](./docs/SECURITY_CHECKLIST.md)
- [Development deployment](./docs/DEVELOPMENT_DEPLOYMENT.md)

## Submission operator checklist

- [x] Public repository, MIT license, live Vercel URL, registration applied by organizers (`cf646b3`)
- [x] End-to-end product code, tests, reusable package, documentation, and evidence validator
- [ ] Deploy the immutable registry on mainnet and record its address
- [ ] Run the synthetic three-recipient payroll with human wallet approval
- [ ] Verify and add at least three qualifying mainnet pool transaction hashes
- [ ] Record/upload the three-minute demo and add its URL
- [ ] Run `pnpm submission:check -- --strict`, verify the live app signed out, and create the final tag

The irreversible steps are detailed in [`docs/MAINNET_RUNBOOK.md`](./docs/MAINNET_RUNBOOK.md). Never commit a wallet private key, viewing key, claim key, or real payroll record.
