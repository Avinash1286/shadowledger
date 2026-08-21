# ShadowLedger

Private payroll and treasury disbursements with public aggregate accountability on Starknet STRK20.

ShadowLedger is an entry for the STRK20 Private Sprint 2026, in the **Payments** category and inspired by **RFP-11**. The MVP will let an organization commit to an aggregate payroll run, distribute individual allocations as private STRK20 notes, and give recipients and auditors selective verification artifacts.

- Live app: <https://shadowledger-six.vercel.app>
- Official registration: <https://github.com/starkience/strk20-hackathon/pull/49>

## Current milestone — complete through August 21

The web app currently provides:

- A browser-only payroll builder at [`/payroll/new`](https://shadowledger-six.vercel.app/payroll/new) with manual rows and local CSV import.
- Exact token-decimal conversion, Starknet address and duplicate checks, aggregate calculation, and downloadable local error reports.
- A three-recipient [`demo-payroll.csv`](./apps/web/public/demo-payroll.csv) fixture with quoted-comma coverage.
- A reusable outgoing-payload guard that rejects plaintext `recipient`, `amount`, `memo`, or `salt` fields.
- Domain-separated run IDs and salted payroll leaves using Starknet Poseidon.
- Positional Merkle trees, documented empty-leaf padding, and proof generation/verification for every row.
- A canonical public manifest and manifest hash containing no individual payroll data.
- A Cairo `PayrollRegistry` with immutable ownership, aggregate-only events, explicit create/finalize/cancel states, and a five-recipient MVP bound.
- A pinned Scarb/Starknet Foundry toolchain and contract tests covering every state transition, invalid boundary, event privacy, and fuzzed valid amounts/counts.
- A typed registry client with create/finalize/cancel operations, receipt-event binding, state readback, and a walletless public run page.
- A local Starknet Devnet deployment with checked-in public evidence; the app-to-contract development check creates and finalizes a fresh run from the registry page.
- Browser-native AES-256-GCM recipient packages with 256-bit random keys, 96-bit IVs, and authenticated blob/run binding.
- Claim URLs that keep the decryption key exclusively in the URL fragment, plus recipient-side local decryption.
- Convex functions for authenticated ciphertext storage, rate-limited public lookup, owner-only revocation, expiry, and a token-gated local fixture path.
- A separately encrypted admin recovery bundle whose key is downloaded independently.
- Wrong-key, ciphertext-tamper, AAD-tamper, and ciphertext-privacy tests, including a real local Convex integration test.
- Wallet Standard discovery with explicit Ready wallet guidance.
- A hard `SN_MAIN` guard before `WalletAccountV6` is constructed or used.
- Wallet API `0.10.3+` and STRK20 capability detection.
- Shielded STRK balance reads directly from the wallet.
- A recipient activation page at [`/recipient/activate`](https://shadowledger-six.vercel.app/recipient/activate) that checks the connected account without requesting a viewing key.
- A capped, single-recipient STRK20 private-transfer flow with exact-input simulation and no public fallback.
- On-chain evidence checks that require a succeeded, accepted receipt with an event from the configured STRK20 pool.
- Fixed, privacy-safe error categories and redacted diagnostics.
- A deliberately capped, user-initiated shield flow that simulates before asking the wallet to submit.

No private key, viewing key, recipient, amount, calldata, or raw wallet error is logged or sent to a server.

The August 20 registry deployment is intentionally on isolated local Starknet Devnet, not mainnet. This satisfies the plan's development-environment option without spending funds or signing an irreversible transaction. A mainnet registry address must still be deployed and configured before the final hackathon submission.

## Run locally

Requirements: Node.js 20.9+ and pnpm 10.

```bash
pnpm install
cp .env.example apps/web/.env.local
pnpm dev
```

Open <http://localhost:3000>, install/open Ready X, select a Starknet mainnet account, then connect. The app will refuse Sepolia and unknown chain IDs.

The shield and private-transfer forms can create real mainnet transactions. Both require exact-input simulation and a fresh chain check before opening the wallet approval request. The shield is capped at 1 STRK; the technical private transfer is capped at 0.1 STRK and requires an independently verified recipient-readiness acknowledgement. Review fees and gas in Ready X before approving. A shield/deposit is public; a STRK20 transfer must never fall back to a public token transfer.

## Checks

```bash
pnpm check
```

This runs ESLint, strict TypeScript, unit tests, and the production build. Pure helpers for chain parsing, amount parsing, Wallet API capability checks, and error redaction have unit coverage.

The Cairo contract has its own checks under [`contracts`](./contracts); see [`contracts/README.md`](./contracts/README.md) for native and Docker commands.

The reproducible Devnet and local Convex workflow is documented in [`docs/DEVELOPMENT_DEPLOYMENT.md`](./docs/DEVELOPMENT_DEPLOYMENT.md). Public Devnet transaction evidence is committed at [`contracts/deployments/devnet.json`](./contracts/deployments/devnet.json); it contains no private key.

Vercel runs the same lint, typecheck, test, and production-build gate for every deployment through `apps/web/vercel.json`. The Vercel project root must be set to `apps/web` when importing this monorepo.

## Configuration

Copy the root `.env.example` into `apps/web/.env.local`. Public pool and token addresses remain environment-driven. Never add wallet keys or viewing keys to any environment file.

Before a real transaction, verify the pool address against the current official STRK20 mainnet guide. Transaction hashes belong in the root `strk20.json` only after explorer verification.

## Roadmap

See [`plan.md`](./plan.md) for the product, privacy, contract, testing, mainnet, and submission plan.
The August 16 operational checklist is in [`docs/RECIPIENT_READINESS.md`](./docs/RECIPIENT_READINESS.md).
The commitment, Merkle, canonical manifest, AES-GCM envelope, claim-link, and recovery formats are fixed in [`docs/RECEIPT_SPEC.md`](./docs/RECEIPT_SPEC.md).

## License

MIT
