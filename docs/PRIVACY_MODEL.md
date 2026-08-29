# Privacy model

ShadowLedger provides data minimization and selective disclosure around STRK20 private transfers. It does not promise anonymity against every timing, amount-correlation, endpoint, wallet, or compromised-device adversary.

| Data | Public | Recipient claim | Payer/audit package |
| --- | --- | --- | --- |
| Payer, token, run status | Yes | Yes | Yes |
| Aggregate total and recipient count | Yes | Yes | Yes |
| Merkle root, manifest hash, pool transaction hash | Yes | Yes | Yes |
| Individual recipient and amount | No | Own row only | Yes |
| Period and memo | Period hash only | Own plaintext | Yes |
| Per-row random salt and proof | No | Own values | Yes |
| Wallet viewing/private keys | Never requested | Never requested | Never requested |

## Controls

- CSV and manual rows stay in browser memory.
- Every row has a cryptographically random, unique 248-bit salt.
- Only aggregate fields are passed to the registry client.
- A recursive guard rejects outbound objects containing `recipient`, `amount`, `memo`, or `salt` in plaintext.
- Claim blobs use AES-256-GCM with a random 256-bit key, random 96-bit IV, and blob/run authenticated data.
- Claim keys are URL fragments, which browsers do not include in HTTP requests.
- Claim and auditor routes are `noindex`, `noarchive`, `no-store`, and `Referrer-Policy: no-referrer`.
- The auditor workspace performs no network request and offers explicit memory clearing.

## Limitations

- A compromised browser, extension, clipboard, operating system, or screen recording can expose payroll data.
- RPC and wallet providers can observe network metadata. STRK20 supplies the private-transfer mechanism; ShadowLedger does not independently prove its anonymity set.
- Aggregate totals and counts may enable inference for small or distinctive payrolls. The MVP therefore requires 3–5 recipients, but this is not a formal privacy guarantee.
- Sharing a claim link shares its decryption key. Forward it only through an authenticated channel.
- Ciphertext availability is not guaranteed. Keep the separately encrypted recovery bundle and key in different secure locations.
- The audit package is intentionally plaintext and highly sensitive.
