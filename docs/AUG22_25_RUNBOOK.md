# August 22–25 payroll runbook

## Safety boundary

The implementation is complete through the local and wallet-gated stages. A real August 23 mainnet run is not complete until a human approves all three transactions in a funded privacy-enabled wallet and the resulting hashes pass the app's receipt checks. Never invent or pre-fill those hashes.

Prerequisites:

1. Configure and independently verify `NEXT_PUBLIC_PAYROLL_REGISTRY_ADDRESS` on Starknet Mainnet.
2. Connect a Wallet API 0.10.3+ account on `SN_MAIN` with STRK20 support.
3. Activate all three recipients for the configured token.
4. Ensure the shielded token balance covers the exact batch aggregate. Gas is paid separately.

## August 22 — simulation

Open `/payroll/new`, connect the wallet, import or enter three to five rows, and generate a commitment. The batch panel maps the committed row order to one STRK20 action array. Click **Simulate batch**. A successful result means `strk20PrepareInvoke(actions, true)` completed for the entire target-wallet batch without changing chain state.

Changing any payroll or run input invalidates the commitment and requires fresh salts and a new simulation.

## August 23 — real mainnet run

Each numbered action has an independent wallet prompt:

1. **Create registry run** publishes only the aggregate commitment and waits for the expected registry event plus state readback.
2. **Submit private batch** repeats simulation, rechecks both wallet and RPC chain IDs, and submits all recipient transfers in one STRK20 invocation.
3. Confirmation requires a succeeded, accepted transaction receipt with an event from the configured STRK20 pool.
4. **Finalize registry** binds that eligible pool transaction hash to the committed run and verifies the finalized state.
5. Download `shadowledger-mainnet-run-evidence.json`. Copy the explorer-verified transaction hashes to the root `strk20.json`; do not add recipient details.

If the page is interrupted after submission, paste the transaction hash into **Recover confirmation by transaction hash**. This resumes receipt verification and does not resubmit the private batch.

## August 24 — recipient receipt

After finalization, select a recipient and click **Sign and download receipt**. The wallet signs SNIP-12 typed data binding the payer, disclosed payment line, leaf, Merkle root, manifest hash, and STRK20 transaction hash. Send the resulting JSON through the encrypted-receipt workflow or another private channel.

The recipient opens `/verify`, uploads the JSON, and runs local verification first. The optional mainnet check validates the payer account signature and compares the run, root, manifest, transaction, total, and count with the registry contract.

## August 25 — auditor mode

The payer downloads the clearly marked private audit package from the commitment panel and transfers it privately to the auditor. The auditor opens `/auditor`, uploads it locally, and recomputes the Poseidon root, canonical manifest hash, aggregate, recipient count, token, and period.

The package contains the complete payroll and salts. Use **Clear package from memory** after review, close the tab, and delete temporary copies according to the organization's retention policy.
