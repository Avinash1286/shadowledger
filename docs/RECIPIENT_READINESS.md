# Recipient Readiness and Technical Transfer Runbook

This runbook covers ShadowLedger's August 16 mainnet milestone. It prepares three
demo recipients, verifies their STRK20 registration precondition, and proves the
end-to-end recipient path with one deliberately small private transfer.

Mainnet transactions are real and irreversible. The operator must review and
approve every wallet prompt. Never enter or share a seed phrase, private key, or
viewing key with ShadowLedger, Codex, a browser page, or this repository.

## Completion gate

August 16 is complete only when all of the following are true:

- Three isolated demo recipient accounts are available in a supported Ready
  wallet on Starknet mainnet.
- Each recipient passes the STRK20 registration/readiness check.
- A tiny technical private transfer is simulated and submitted without a public
  transfer fallback.
- The transaction succeeds on-chain and is verified to interact with the
  configured STRK20 pool.
- The intended recipient connects independently and discovers the private
  payment through the wallet-managed balance/note flow.
- The verified transaction hash is captured as the second eligible pool
  interaction; the earlier shield remains the first.

Registration alone does not prove the recipient can discover a payment, and a
submitted transaction hash does not prove success. Both checks are required.

## Demo-wallet setup

Use labels in screenshots, notes, and issue comments. Do not commit the mapping
between these labels and real addresses.

| Label | Purpose | Required state |
|---|---|---|
| Sender | Funds and sends the technical transfer | Mainnet, STRK20-capable, confirmed shielded balance |
| Recipient A | Receives the August 16 technical transfer | Mainnet, registered, ready to receive |
| Recipient B | Reserved for the payroll batch | Mainnet, registered, ready to receive |
| Recipient C | Reserved for the payroll batch | Mainnet, registered, ready to receive |

For every account:

1. Use a demo-only account, not a personal wallet or production treasury.
2. Confirm the recovery method is backed up without exposing it to the app.
3. Select Starknet mainnet and verify that the connected chain is `SN_MAIN`.
4. Confirm Ready exposes Wallet API `0.10.3` or newer and the required STRK20
   methods.
5. Keep only the minimum public STRK needed for registration and gas.
6. Record the label-to-address mapping only in an access-controlled local note.

The sender additionally needs a confirmed shielded STRK balance sufficient for
the test amount and fees. As of August 15, 2026, the official Starknet launch
post states a **4 STRK fee per privacy action, plus gas**; verify the current
total in Ready X before every approval. If the shield is recent, wait for
confirmation and note maturity before trying to spend it.

## Configuration preflight

Before registering or transferring:

- Compare the production pool and STRK token configuration with the current
  official STRK20 mainnet guide.
- Confirm the live application reports mainnet and the expected shortened pool
  address.
- Confirm the wallet, RPC, and explorer all report the same chain.
- Stop if any contract address, token, network, or wallet capability is
  unexpected. Do not approve the prompt and do not fall back to a public
  transfer.

## Register each recipient

Complete this flow separately for Recipient A, B, and C:

1. Open the ShadowLedger recipient activation page when available. Until then,
   use Ready X's in-wallet privacy or Shield Mode flow.
2. Connect the intended Ready account and check `SN_MAIN` again.
3. Run the capability and registration preflight.
4. If registration is required, open the same account inside Ready X, enter its
   privacy activation flow, and approve only the expected registration action.
5. Wait for an on-chain success result. Do not treat `submitted` or `pending` as
   registered.
6. Reconnect or refresh the readiness check and require a clear **Ready to
   receive** result.
7. Record only the recipient label, UTC date, readiness result, and a redacted
   diagnostic category if it failed.

Recipient registration is public and can create timing correlation. Space the
demo preparation from the final payroll where practical. A registration hash
must not be added to `strk20.json` unless it is separately verified as an
eligible STRK20 pool interaction under the sprint rules.

## Execute the technical private transfer

Use Recipient A for the first end-to-end check.

1. Reconfirm the sender's mainnet chain, STRK20 capabilities, shielded balance,
   and mature input note.
2. Reconfirm Recipient A is **Ready to receive** and validate the recipient
   address against the private label-to-address mapping.
3. Enter a pre-agreed test amount small enough to lose without harm. Keep enough
   public STRK for gas.
4. Simulate the single private transfer. Stop on `NOT_REGISTERED`, insufficient
   shielded balance, immature input, address mismatch, pool mismatch, or any
   unknown result.
5. Review the wallet prompt for the intended private action, token, and network.
   The human operator must approve it.
6. Submit once. Disable duplicate submission after a transaction hash is
   returned.
7. If the result is uncertain, preserve the hash and query its status. Never
   blindly retry an unknown submission.
8. Wait for on-chain success, then confirm through the explorer that the
   configured STRK20 pool was touched.

The explorer proves transaction status and pool interaction. It should not be
described as revealing the hidden recipient or private amount.

## Recipient discovery check

After the transfer succeeds:

1. Switch to Recipient A and verify the connected account against the private
   label-to-address mapping.
2. Connect on `SN_MAIN` and trigger the wallet-managed STRK20 balance refresh.
   ShadowLedger must not request a viewing key.
3. Compare the private balance with the private pre-transfer record and require
   the expected aggregate balance increase. Wallet API 0.10.3 does not expose a
   note list or payment history to the dapp.
4. Refresh once or reconnect if discovery is still processing. Do not resubmit
   the payment merely because discovery is delayed.
5. Record a pass/fail readiness result. Keep the recipient address, balance,
   amount, and note details out of public logs and screenshots.

If the transaction succeeded but discovery does not complete, preserve the hash
and capture a redacted stage/error category. The August 16 exit gate remains
open until the intended recipient discovers the payment.

## Small-funds safety rules

- Set the test cap before opening a wallet prompt; never increase it during the
  flow without a fresh review.
- Use one transaction at a time and wait for final status before another spend.
- Never use funds whose loss would be harmful.
- Never paste addresses, amounts, calldata, raw wallet errors, balances, or note
  data into public logs, analytics, screenshots, issues, or chat.
- Never accept a public-transfer fallback when a private action fails.
- Stop immediately on the wrong chain, an unexpected pool/token address, a
  different recipient account, or an unfamiliar wallet request.

Fee source: [Privacy is Live on Starknet](https://www.starknet.io/blog/privacy-live-on-starknet/).

## Evidence capture

Maintain two evidence layers:

**Private operator record**

- Recipient label-to-address mapping.
- Intended test amount and private before/after balance check.
- Registration details needed for troubleshooting.
- Any unredacted wallet output.

Keep this record access-controlled and outside the repository.

**Public eligibility record**

- Purpose: `Technical private transfer`.
- UTC date.
- Successful transaction hash and direct explorer link.
- `Pool touched: Yes`, only after verifying the configured pool interaction.
- Recipient discovery: `Passed`, without address, balance, or amount.

Add the transaction hash to the future `docs/MAINNET_RUNBOOK.md` evidence ledger
and root `strk20.json` only after success and eligibility are verified. A failed,
pending, registration-only, or unverified transaction is not submission
evidence.

## Operator sign-off

- [ ] Sender is on `SN_MAIN`, STRK20-capable, funded, and using a mature note.
- [ ] Recipient A is registered and ready to receive.
- [ ] Recipient B is registered and ready to receive.
- [ ] Recipient C is registered and ready to receive.
- [ ] The tiny private transfer simulation passed.
- [ ] The wallet submitted exactly once after human review.
- [ ] The transaction succeeded and the configured pool interaction was verified.
- [ ] Recipient A discovered the private payment.
- [ ] Only privacy-safe public evidence was recorded.
- [ ] Two eligible mainnet pool transaction hashes now exist.
