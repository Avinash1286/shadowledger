# Architecture

ShadowLedger is a client-heavy Next.js application for private STRK payroll. The browser performs CSV parsing, exact amount conversion, commitment generation, wallet discovery, transaction simulation, and receipt encryption. No backend receives plaintext payroll rows.

## Components

1. **Payroll builder** — validates 3–5 recipient rows and converts decimal STRK values to integer base units.
2. **Commitment engine** — `@shadowledger/payroll-core` derives a domain-separated run ID, salted Poseidon leaves, a padded positional Merkle tree, and a canonical aggregate-only manifest.
3. **Ready wallet adapter** — requires Wallet API `0.10.3+`, STRK20 capabilities, a connected `SN_MAIN` account, private balance, and successful exact-input simulation before submission.
4. **STRK20 pool** — receives the wallet-created shield or private transfer. ShadowLedger never falls back to a public ERC-20 transfer.
5. **Payroll registry** — records only payer, token, aggregate, recipient count, Merkle root, manifest hash, lifecycle status, and eligible STRK20 transaction hash.
6. **Receipt layer** — signs each disclosed line with SNIP-12, then optionally encrypts the portable receipt using AES-256-GCM. The decryption key remains in the claim URL fragment.
7. **Verifier and auditor** — the recipient verifier recomputes one leaf and proof; the offline auditor recomputes every commitment value without network access.

```text
CSV/manual rows ──browser──> validation ──> Poseidon leaves ──> Merkle root
      │                                                     │
      │ never uploaded                                      ├─> public registry
      └─> Ready wallet ──simulate/approve──> STRK20 pool    └─> signed receipt
                                                               │
                         encrypted blob <──AES-GCM─────────────┘
                         claim URL key stays after #
```

## Trust boundaries

- The organization trusts its local browser and wallet extension with plaintext.
- The public RPC and registry see aggregate commitment data and transaction metadata.
- Optional Convex storage sees ciphertext, random blob IDs, expiry, and rate-limit metadata.
- A recipient learns only their own disclosed row plus public aggregate data.
- An auditor learns every row only when the payer deliberately exports and shares an audit package.

The Cairo registry is immutable for the MVP and deliberately has no upgrade or admin mutation path. See [THREAT_MODEL.md](./THREAT_MODEL.md) and [PRIVACY_MODEL.md](./PRIVACY_MODEL.md).
