# Three-minute demo script

Use only synthetic demo accounts and amounts. Record at 1080p, hide bookmarks and unrelated wallet accounts, and keep explorer hashes readable.

| Time | Screen | Narration |
| --- | --- | --- |
| 0:00–0:20 | Landing + privacy table | “ShadowLedger runs private STRK payroll while publishing an aggregate commitment for accountability.” |
| 0:20–0:45 | Dashboard + Ready connection | Show mainnet/config readiness and explain hard failure on wrong chain or missing capability. |
| 0:45–1:15 | Payroll builder | Import the three-recipient demo CSV. Show local validation, aggregate, run ID, and Merkle root; emphasize that rows never leave the browser. |
| 1:15–1:45 | Wallet simulation + execution evidence | Show exact-total private balance, successful simulation, accepted STRK20 pool transaction, and registry finalization. Do not record seed phrases or sensitive diagnostics. |
| 1:45–2:25 | Recipient claim | Open a prepared claim in the recipient profile. Show local decryption, connected-recipient match, Merkle proof, payer signature, registry match, and explorer link. |
| 2:25–2:45 | Auditor | Load a synthetic audit package offline, show all recomputations pass, then clear memory. |
| 2:45–3:00 | Repository + close | Show public repository, `strk20.json`, tests, architecture, and live URL. Close with “private line items, public aggregate accountability.” |

After upload, add the public video URL to root `strk20.json`, run the strict submission check, and verify playback in a signed-out browser.
