# Auditor mode privacy and verification

`shadowledger/audit-package/v1` is a portable JSON package containing the public manifest and every private commitment input: entry index, recipient, token, base-unit amount, period hash, memo hash, and salt. It must be treated as payroll-confidential data.

The `/auditor` page reads the selected file with the browser File API. Verification does not use `fetch`, an API route, analytics, storage, or a wallet. It rebuilds every leaf with the committed run ID, creates the positional padded Poseidon tree, canonicalizes the public manifest, and compares:

- Merkle root
- manifest hash
- aggregate amount
- recipient count
- token consistency
- period consistency

A pass demonstrates that the disclosed private payroll reproduces the supplied public commitment. It does not independently prove that recipients control their addresses or that a transaction was accepted; use the portable receipt mainnet comparison and finalized registry evidence for those claims.

The clear-memory control removes the source text and report from React state. Closing the tab releases the page context. It cannot erase copies retained by the browser, operating system, backups, or the person who supplied the file.
