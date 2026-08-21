# August 20–21 development verification

This workflow reproduces the registry and encrypted-receipt exit criteria without mainnet funds. Docker binds Starknet Devnet to loopback, and Convex uses its anonymous local deployment. Neither service is suitable for production.

## 1. Starknet registry

Build the checked-in Cairo toolchain image if it is not already present, then start Devnet:

```powershell
docker build -t shadowledger-cairo:2.20.1-0.63.0 contracts
docker run --name shadowledger-devnet --rm -p 127.0.0.1:5050:5050 starknetfoundation/starknet-devnet-rs:0.9.2-seed0 --accounts 3
```

In another terminal:

```powershell
docker run --rm -v "${PWD}\contracts:/workspace" -w /workspace shadowledger-cairo:2.20.1-0.63.0 bash -lc "scarb build && snforge test"
pnpm --filter @shadowledger/web registry:deploy:devnet
```

The deployment script declares and deploys `PayrollRegistry`, creates a three-recipient test commitment, finalizes it, checks both contract events, reads final status `2`, and writes public evidence to `contracts/deployments/devnet.json`. The registry page also exposes a development-only button that repeats create/finalize through the running app with a fresh run ID.

## 2. Local Convex ciphertext

```powershell
cd apps/web
pnpm exec convex dev --once
pnpm exec convex env set SHADOWLEDGER_LOCAL_FIXTURE_TOKEN shadowledger-local-aug21
pnpm exec convex dev
```

Keep Convex running. In a second terminal, run the database integration check:

```powershell
$env:SHADOWLEDGER_TEST_CONVEX_URL='http://127.0.0.1:3210'
$env:SHADOWLEDGER_LOCAL_FIXTURE_TOKEN='shadowledger-local-aug21'
pnpm exec vitest run tests/convex-receipt.integration.test.ts
```

The test encrypts a payroll receipt, stores only its envelope in Convex, confirms the stored JSON contains none of the recipient, amount, or memo strings, and decrypts after supplying the separate key. The standard test suite also proves wrong-key, ciphertext-tamper, and authenticated-metadata-tamper failures.

## 3. Browser story

Run `pnpm dev` from `apps/web`, open `/registry`, and execute the Devnet check. Then open `/receipts`, encrypt the sample receipt, and follow its fragment-key claim link. Development-only fixture endpoints return `404` from production builds.

For production, configure a real Convex deployment and identity provider for authenticated storage. Deploy the immutable registry to Starknet mainnet only after reviewing gas, funding the deployer with a tiny safe amount, and independently verifying the compiled class hash.
