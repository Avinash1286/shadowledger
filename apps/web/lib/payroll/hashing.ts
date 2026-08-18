import { hash, shortString } from "starknet";

export const DOMAIN_TAGS = {
  RUN: "SHADOWLEDGER_RUN_V1",
  LEAF: "SHADOWLEDGER_LEAF_V1",
  NODE: "SHADOWLEDGER_NODE_V1",
  MANIFEST: "SHADOWLEDGER_MANIFEST_V1",
  RECEIPT: "SHADOWLEDGER_RECEIPT_V1",
  EMPTY_LEAF: "SHADOWLEDGER_EMPTY_LEAF_V1",
} as const;

export function asciiDomainFelt(tag: string): bigint {
  return BigInt(shortString.encodeShortString(tag));
}

export const DOMAIN_FELTS = {
  RUN: asciiDomainFelt(DOMAIN_TAGS.RUN),
  LEAF: asciiDomainFelt(DOMAIN_TAGS.LEAF),
  NODE: asciiDomainFelt(DOMAIN_TAGS.NODE),
  MANIFEST: asciiDomainFelt(DOMAIN_TAGS.MANIFEST),
  RECEIPT: asciiDomainFelt(DOMAIN_TAGS.RECEIPT),
  EMPTY_LEAF: asciiDomainFelt(DOMAIN_TAGS.EMPTY_LEAF),
} as const;

export function poseidonHash(values: readonly bigint[]): bigint {
  return BigInt(hash.computePoseidonHashOnElements([...values]));
}

export function hashLocalText(value: string): bigint {
  const canonical = value.trim().normalize("NFC");
  return canonical.length === 0 ? 0n : hash.starknetKeccak(canonical);
}

export const EMPTY_LEAF_V1 = poseidonHash([DOMAIN_FELTS.EMPTY_LEAF]);
