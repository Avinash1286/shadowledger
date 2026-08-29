# Mainnet runbook

This runbook contains irreversible wallet actions. Use small demo values, synthetic recipients, and verify every address independently.

## Preconditions

- `pnpm check` passes on the exact commit to be deployed.
- Ready Wallet API is `0.10.3+`, the account is on `SN_MAIN`, and STRK20 capability detection passes.
- The official pool address is rechecked against current STRK20 documentation.
- Three synthetic recipient accounts have passed `/recipient/activate`.
- The immutable registry is deployed and its address is set in Vercel Production.
- Payer and recipients have enough public STRK for fees; the payer has the exact private balance needed.

## Execute

1. Open `/payroll/new`, load `demo-payroll.csv`, and replace fixture addresses only with the three verified demo recipients.
2. Review the aggregate, recipient count, run ID, Merkle root, and local manifest download.
3. Create the aggregate registry run and wait for an accepted receipt.
4. Simulate the complete 3–5 transfer batch. Stop on any warning, shortfall, capability error, chain change, or unexpected calldata.
5. Approve the private batch in Ready. Save the returned hash only after the explorer and pool-event verifier report accepted success.
6. Finalize the same registry run with that eligible STRK20 hash and wait for accepted success.
7. Sign and encrypt each portable receipt. Deliver each claim URL separately; download the encrypted recovery bundle and store its key elsewhere.
8. In a recipient profile, open one claim and verify local commitment, connected recipient, payer signature, finalized registry state, and STRK20 evidence.
9. Export an audit package, disconnect networking, load `/auditor`, and require every recomputation to pass. Clear memory afterward.

## Evidence

Record at least three successful mainnet transaction hashes that touch the official pool in root `strk20.json`. Use lowercase `0x` hashes. Run:

```bash
pnpm submission:check -- --strict
```

Never add a failed, pending, Sepolia, Devnet, fabricated, or unrelated transaction. The current repository intentionally remains incomplete until real human-approved evidence exists.

## Abort conditions

Abort without fallback if the wallet switches chain, simulation changes, pool address differs, an address is unverified, the private balance is insufficient, the receipt is rejected/reverted, or the expected pool event is absent.
