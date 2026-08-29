# Threat model

## Protected assets

Individual recipients, amounts, memos, salts, claim keys, wallet secrets, and the integrity of the public aggregate record.

## In scope

| Threat | Mitigation | Residual risk |
| --- | --- | --- |
| Wrong network or malicious RPC configuration | Hard `SN_MAIN` check before wallet-account construction and again before every wallet action; HTTPS-only public RPC config | A malicious mainnet RPC can lie until receipt/event checks fail |
| Public-transfer fallback | Only STRK20 Wallet API methods are mapped; unsupported capability is a hard failure | Wallet implementation remains trusted |
| Payroll uploaded accidentally | Browser-only parsing plus recursive outbound plaintext guard and tests | Compromised first-party JavaScript can read memory |
| Amount/address input ambiguity | Integer base-unit conversion, no scientific notation, canonical addresses, duplicate checks, u128 bounds | Operator can still enter the wrong valid address |
| Tampered receipt/blob | AES-GCM authenticated encryption; run-bound AAD; leaf, Merkle, manifest, SNIP-12, registry, and pool-event checks | A recipient must perform online checks for payer/chain authenticity |
| Claim-key leakage | Key in URL fragment; no-referrer/no-store/noindex; no analytics | Clipboard, browser history, screenshots, or forwarding can leak it |
| Replay/duplicate run mutation | Deterministic run ID, immutable registry create, explicit lifecycle, receipt-state checks | A payer can create a separate run with a new nonce |
| Backend compromise | Optional storage receives ciphertext only; random IDs, expiry, rate limits, revocation | Traffic and blob metadata remain visible; deletion affects availability |
| Malicious CSV | Fixed schema, size/count limits, quoted CSV parser, downloadable local errors | Spreadsheet formula behavior matters if exported elsewhere |
| Framing and content injection | CSP, `frame-ancestors 'none'`, `X-Frame-Options`, no object embedding, React escaping | `unsafe-inline` is retained for Next.js compatibility; nonce CSP is future hardening |

## Out of scope

- A fully compromised payer or recipient device.
- Malware in a wallet extension or signing device.
- Global traffic analysis and STRK20 protocol cryptanalysis.
- Coercion, payroll correctness, employment-law compliance, taxation, or key custody.
- Contract upgrade risk: the MVP registry is intentionally non-upgradeable; redeployment creates a new trust root.

## Security reporting

Do not open a public issue for an exploitable vulnerability. Follow the private process in [`SECURITY.md`](../SECURITY.md).
