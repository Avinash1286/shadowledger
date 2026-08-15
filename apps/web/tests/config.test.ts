import { describe, expect, it } from "vitest";

import { parsePublicConfig, type PublicConfigInput } from "../lib/config";

const VALID_CONFIG: PublicConfigInput = {
  network: "mainnet",
  chainId: "SN_MAIN",
  rpcUrl: "https://rpc.starknet.lava.build",
  poolAddress: "0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a",
  tokenAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
  tokenSymbol: "STRK",
  tokenDecimals: "18",
};

describe("public configuration parsing", () => {
  it("accepts the explicit mainnet configuration", () => {
    const result = parsePublicConfig(VALID_CONFIG);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.config.chainId).toBe("SN_MAIN");
  });

  it("blocks testnet configuration before a wallet can be used", () => {
    expect(parsePublicConfig({ ...VALID_CONFIG, network: "sepolia" }).ok).toBe(false);
    expect(parsePublicConfig({ ...VALID_CONFIG, chainId: "SN_SEPOLIA" }).ok).toBe(false);
    expect(parsePublicConfig({ ...VALID_CONFIG, chainId: "sn_main" }).ok).toBe(false);
  });

  it("rejects missing or malformed public addresses", () => {
    expect(parsePublicConfig({ ...VALID_CONFIG, poolAddress: "" }).ok).toBe(false);
    expect(parsePublicConfig({ ...VALID_CONFIG, tokenAddress: "not-an-address" }).ok).toBe(false);
  });
});
