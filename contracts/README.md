# PayrollRegistry contract

`PayrollRegistry` is ShadowLedger's public accountability layer. It records one aggregate payroll commitment and, after a successful STRK20 transfer, its transaction hash. It never receives or stores recipient addresses, individual amounts, memos, salts, CSV rows, proofs, or encryption keys.

## State machine

```text
Missing --create_run--> Created --finalize_run--> Finalized
                              \\--cancel_run----> Cancelled
```

Only the account that creates a run can finalize or cancel it. Finalized and cancelled runs are terminal. The MVP recipient limit is `5`, matching the browser payroll builder.

`owner_nonces[owner]` increments after every successful creation. The nonce is exposed for deterministic off-chain run-ID generation; the contract treats the supplied Poseidon `run_id` as an opaque unique key.

## Public data

Each run stores:

- owner and token contract addresses;
- aggregate amount and recipient count;
- period, Merkle root, and canonical manifest hashes;
- STRK20 transaction hash after finalization;
- creation/finalization timestamps and status.

Events contain the same aggregate fields and no per-recipient material.

## Toolchain and tests

The repository pins Scarb `2.20.1` (Cairo `2.20.0`), Starknet Foundry `0.63.0`, and Universal Sierra Compiler `2.10.0` in the root `.tool-versions` file.

On Linux, macOS, or WSL with those tools installed:

```bash
cd contracts
scarb fmt --check
scarb build
scarb test
```

On Windows with Docker Desktop:

```powershell
docker build -t shadowledger-cairo:2.20.1-0.63.0 contracts
docker run --rm --mount "type=bind,source=$PWD,target=/workspace" -w /workspace/contracts shadowledger-cairo:2.20.1-0.63.0 scarb test
```

The Docker build verifies every downloaded release archive against its published SHA-256 digest. Network profiles and deployment addresses are intentionally deferred to the August 20 registry integration milestone.
