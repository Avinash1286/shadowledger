import { isStarknetAddress } from "@/lib/strk20/address";

export type PublicConfig = {
  network: "mainnet";
  chainId: "SN_MAIN";
  rpcUrl: string;
  poolAddress: `0x${string}`;
  tokenAddress: `0x${string}`;
  tokenSymbol: string;
  tokenDecimals: number;
};

export type PublicConfigInput = {
  network?: string;
  chainId?: string;
  rpcUrl?: string;
  poolAddress?: string;
  tokenAddress?: string;
  tokenSymbol?: string;
  tokenDecimals?: string;
};

export type PublicConfigResult =
  | { ok: true; config: PublicConfig }
  | { ok: false; message: string };

export function parsePublicConfig(input: PublicConfigInput): PublicConfigResult {
  if (input.network?.trim().toLowerCase() !== "mainnet") {
    return { ok: false, message: "NEXT_PUBLIC_STARKNET_NETWORK must be mainnet." };
  }

  if (input.chainId?.trim() !== "SN_MAIN") {
    return { ok: false, message: "NEXT_PUBLIC_STARKNET_CHAIN_ID must be SN_MAIN." };
  }

  const rpcUrl = input.rpcUrl?.trim();
  if (!rpcUrl) {
    return { ok: false, message: "NEXT_PUBLIC_STARKNET_RPC_URL is required." };
  }

  try {
    const parsed = new URL(rpcUrl);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
      return { ok: false, message: "The Starknet RPC URL must use HTTPS." };
    }
  } catch {
    return { ok: false, message: "NEXT_PUBLIC_STARKNET_RPC_URL is not a valid URL." };
  }

  const poolAddress = input.poolAddress?.trim();
  if (!poolAddress || !isStarknetAddress(poolAddress)) {
    return { ok: false, message: "NEXT_PUBLIC_STRK20_POOL_ADDRESS is invalid." };
  }

  const tokenAddress = input.tokenAddress?.trim();
  if (!tokenAddress || !isStarknetAddress(tokenAddress)) {
    return { ok: false, message: "NEXT_PUBLIC_PAYROLL_TOKEN_ADDRESS is invalid." };
  }

  const decimals = Number(input.tokenDecimals);
  if (!Number.isSafeInteger(decimals) || decimals < 0 || decimals > 255) {
    return { ok: false, message: "NEXT_PUBLIC_PAYROLL_TOKEN_DECIMALS is invalid." };
  }

  const tokenSymbol = input.tokenSymbol?.trim();
  if (!tokenSymbol) {
    return { ok: false, message: "NEXT_PUBLIC_PAYROLL_TOKEN_SYMBOL is required." };
  }

  return {
    ok: true,
    config: {
      network: "mainnet",
      chainId: "SN_MAIN",
      rpcUrl,
      poolAddress: poolAddress as `0x${string}`,
      tokenAddress: tokenAddress as `0x${string}`,
      tokenSymbol,
      tokenDecimals: decimals,
    },
  };
}

export function readPublicConfig(): PublicConfigResult {
  return parsePublicConfig({
    network: process.env.NEXT_PUBLIC_STARKNET_NETWORK,
    chainId: process.env.NEXT_PUBLIC_STARKNET_CHAIN_ID,
    rpcUrl: process.env.NEXT_PUBLIC_STARKNET_RPC_URL,
    poolAddress: process.env.NEXT_PUBLIC_STRK20_POOL_ADDRESS,
    tokenAddress: process.env.NEXT_PUBLIC_PAYROLL_TOKEN_ADDRESS,
    tokenSymbol: process.env.NEXT_PUBLIC_PAYROLL_TOKEN_SYMBOL,
    tokenDecimals: process.env.NEXT_PUBLIC_PAYROLL_TOKEN_DECIMALS,
  });
}
