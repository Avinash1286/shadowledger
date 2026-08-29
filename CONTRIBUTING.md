# Contributing

Use Node.js 20.9+ and pnpm 10. Create a focused branch, avoid real payroll data, and run `pnpm check` before opening a pull request. Contract changes must also pass the Scarb/Starknet Foundry tests documented in `contracts/README.md`.

Commitment or receipt-format changes require versioned domain separation, deterministic fixtures, migration notes, and corresponding updates to `docs/RECEIPT_SPEC.md`. Never weaken the `SN_MAIN`, simulation, private-capability, or plaintext-upload guards to make a demo pass.

Report vulnerabilities privately as described in `SECURITY.md`.
