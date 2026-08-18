# ShadowLedger Commitment and Receipt Hash Specification v1

This document fixes the byte and hash conventions used by the August 18 payroll commitment implementation. It is normative for `shadowledger/payroll-manifest/v1`.

## Primitive

`Poseidon(elements)` means `hash.computePoseidonHashOnElements(elements)` from `starknet@10.4.0`. That function delegates to `@scure/starknet` `poseidonHashMany`; the element order is significant.

All displayed felts use lowercase `0x` hexadecimal without fixed-width padding. Decimal amounts use base-10 strings in the token's smallest unit.

## Domain conversion

Every domain tag is ASCII encoded as one Cairo short string: concatenate each ASCII byte in order and interpret the result as one big-endian felt. This is the behavior of `shortString.encodeShortString`.

| Purpose | Tag | Felt |
| --- | --- | --- |
| Run | `SHADOWLEDGER_RUN_V1` | `0x534841444f574c45444745525f52554e5f5631` |
| Leaf | `SHADOWLEDGER_LEAF_V1` | `0x534841444f574c45444745525f4c4541465f5631` |
| Node | `SHADOWLEDGER_NODE_V1` | `0x534841444f574c45444745525f4e4f44455f5631` |
| Manifest | `SHADOWLEDGER_MANIFEST_V1` | `0x534841444f574c45444745525f4d414e49464553545f5631` |
| Receipt | `SHADOWLEDGER_RECEIPT_V1` | `0x534841444f574c45444745525f524543454950545f5631` |
| Empty leaf | `SHADOWLEDGER_EMPTY_LEAF_V1` | `0x534841444f574c45444745525f454d5054595f4c4541465f5631` |

`EMPTY_LEAF_V1 = Poseidon([EMPTY_LEAF_DOMAIN])` and equals `0xbb049a3a1c614064cae43d74aa940bb779721e32369ea3bd1541292387732b`.

## Text hashing

Periods and memos are trimmed and Unicode NFC-normalized. An empty memo hashes to `0`. Non-empty text uses Starknet Keccak: UTF-8 Keccak-256 masked to 250 bits, matching `hash.starknetKeccak`.

## Run and leaf hashes

```text
run_id = Poseidon([
  RUN_DOMAIN,
  organization_address,
  period_hash,
  organization_run_nonce
])

leaf = Poseidon([
  LEAF_DOMAIN,
  run_id,
  entry_index,
  recipient_address,
  token_address,
  amount_u128,
  period_hash,
  memo_hash,
  random_salt
])
```

Entries are ordered by their explicit numeric index. Duplicate indices and equivalent recipient addresses are rejected. Amounts and their aggregate must fit an unsigned 128-bit integer.

## Merkle tree and proofs

The tree is positional, never sorted by hash:

```text
parent = Poseidon([NODE_DOMAIN, left_child, right_child])
```

The leaf layer is padded with `EMPTY_LEAF_V1` to the next power of two. A proof direction describes the sibling's position: `left` means `parent = Poseidon([NODE_DOMAIN, sibling, current])`; `right` means `parent = Poseidon([NODE_DOMAIN, current, sibling])`.

## Salts

Each entry receives a unique non-zero 31-byte value from `crypto.getRandomValues`. This supplies 248 random bits and is already below the Stark field modulus. Salts are never derived from payroll data and are not included in the public manifest.

## Canonical manifest

The manifest JSON has no whitespace and uses this exact key order:

1. `schema`
2. `network`
3. `runId`
4. `token`
5. `tokenDecimals`
6. `aggregateAmount`
7. `recipientCount`
8. `periodHash`
9. `merkleRoot`
10. `hashAlgorithm`
11. `leafVersion`
12. `createdAt`

`createdAt` is a canonical UTC ISO timestamp. The manifest contains no recipients, individual amounts, memos, salts, leaves, or proofs.

```text
manifest_hash = Poseidon([
  MANIFEST_DOMAIN,
  starknet_keccak(canonical_manifest_json)
])
```

## Deterministic three-row fixture

The checked-in demo CSV, organization `0xabc`, period `2026-08`, nonce `7`, salts `[1, 2, 3]`, and time `2026-08-18T00:00:00.000Z` produce:

- Run ID: `0x3c35879c4e0ad00b1fc249d861ba8d9e374e23a8cc38b20eead8e07d49e474e`
- Merkle root: `0x7187c01b51d5ad9e2ea6c880824b086399c398df1f21949ff8ec64a6075d72f`
- Manifest hash: `0x5e25a2ffb9cf9722be695a1657c097bd2e0bdafe38e5c8872a43c43f57def6f`

The unit fixture fixes every leaf as well. Altering an amount, recipient, memo, salt, sibling, or proof direction must fail verification.
