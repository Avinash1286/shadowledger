# Security checklist

- [x] Browser-only plaintext payroll processing
- [x] Recursive plaintext outbound-payload guard
- [x] Unique cryptographic row salts and domain-separated Poseidon hashes
- [x] Exact integer amount conversion and u128 bounds
- [x] `SN_MAIN` check before every wallet operation
- [x] STRK20 capability detection and no public fallback
- [x] Simulation before user approval
- [x] Accepted-success and pool-event evidence validation
- [x] AES-256-GCM receipt encryption with run-bound AAD
- [x] Claim key remains in URL fragment
- [x] SNIP-12 payer attestation and online account verification
- [x] Registry and Merkle comparison
- [x] Claim/auditor no-store, no-referrer, noindex headers
- [x] Global CSP, clickjacking, MIME, permissions, and HSTS headers
- [x] Wrong-key, tamper, chain, amount, duplicate, and failure-path tests
- [x] Privacy limitations and threat model documented
- [ ] Independent contract/security review (recommended before production use)
- [ ] Real mainnet evidence verified and recorded (submission operator action)
