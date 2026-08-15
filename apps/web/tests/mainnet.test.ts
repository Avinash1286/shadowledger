import { describe, expect, it } from "vitest";

import {
  assertMainnetChain,
  isMainnetChainId,
  MainnetRequiredError,
  normalizeChainId,
} from "../lib/strk20/mainnet";

describe("strict mainnet guard", () => {
  it.each([
    "SN_MAIN",
    "sn_main",
    "0x534e5f4d41494e",
    "0x0534e5f4d41494e",
    "starknet:0x534e5f4d41494e",
    "starknet:SN_MAIN",
  ])("recognizes the Wallet API mainnet representation %s", (chainId) => {
    expect(normalizeChainId(chainId)).toBe("SN_MAIN");
    expect(isMainnetChainId(chainId)).toBe(true);
  });

  it.each([
    "SN_SEPOLIA",
    "0x534e5f5345504f4c4941",
    "starknet:0x534e5f5345504f4c4941",
    "",
    null,
  ])("rejects a non-mainnet or unknown chain representation %s", (chainId) => {
    expect(isMainnetChainId(chainId)).toBe(false);
    expect(() => assertMainnetChain(chainId)).toThrow(MainnetRequiredError);
  });
});
