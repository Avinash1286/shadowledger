# ShadowLedger

Private payroll and treasury disbursements with public aggregate accountability on Starknet STRK20.

ShadowLedger is an entry for the STRK20 Private Sprint 2026, in the **Payments** category and inspired by **RFP-11**. The MVP will let an organization commit to an aggregate payroll run, distribute individual allocations as private STRK20 notes, and give recipients and auditors selective verification artifacts.

- Live app: <https://shadowledger-six.vercel.app>
- Official registration: <https://github.com/starkience/strk20-hackathon/pull/49>

## Current milestone — wallet foundation

The web app currently provides:

- Wallet Standard discovery with explicit Ready wallet guidance.
- A hard `SN_MAIN` guard before `WalletAccountV6` is constructed or used.
- Wallet API `0.10.3+` and STRK20 capability detection.
- Shielded STRK balance reads directly from the wallet.
- Fixed, privacy-safe error categories and redacted diagnostics.
- A deliberately capped, user-initiated shield flow that simulates before asking the wallet to submit.

No private key, viewing key, recipient, amount, calldata, or raw wallet error is logged or sent to a server.

## Run locally

Requirements: Node.js 20.9+ and pnpm 10.

```bash
pnpm install
cp .env.example apps/web/.env.local
pnpm dev
```

Open <http://localhost:3000>, install/open Ready X, select a Starknet mainnet account, then connect. The app will refuse Sepolia and unknown chain IDs.

The shield form can create a real mainnet transaction. It is capped at 1 STRK, requires an explicit acknowledgement, performs a fresh chain check, and simulates immediately before opening the wallet approval request. Review the wallet prompt before approving. A shield/deposit is public.

## Checks

```bash
pnpm check
```

This runs ESLint, strict TypeScript, unit tests, and the production build. Pure helpers for chain parsing, amount parsing, Wallet API capability checks, and error redaction have unit coverage.

Vercel runs the same lint, typecheck, test, and production-build gate for every deployment through `apps/web/vercel.json`. The Vercel project root must be set to `apps/web` when importing this monorepo.

## Configuration

Copy the root `.env.example` into `apps/web/.env.local`. Public pool and token addresses remain environment-driven. Never add wallet keys or viewing keys to any environment file.

Before a real transaction, verify the pool address against the current official STRK20 mainnet guide. Transaction hashes belong in the root `strk20.json` only after explorer verification.

## Roadmap

See [`plan.md`](./plan.md) for the product, privacy, contract, testing, mainnet, and submission plan.

## License

MIT
