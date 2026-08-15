import type { WalletWithStarknetFeatures } from "@starknet-io/get-starknet-wallet-standard/features";
import { walletV6 } from "starknet";

export const MINIMUM_WALLET_API_VERSION = "0.10.3" as const;

type ParsedVersion = readonly [major: number, minor: number, patch: number];

export type WalletCapability = {
  supported: boolean;
  minimumVersion: typeof MINIMUM_WALLET_API_VERSION;
  supportedVersions: string[];
  reason: string | null;
};

export function parseWalletApiVersion(value: string): ParsedVersion | null {
  const match = /^(\d+)\.(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!match) return null;

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3] ?? "0");
  if (![major, minor, patch].every(Number.isSafeInteger)) return null;

  return [major, minor, patch];
}

export function compareWalletApiVersions(left: string, right: string): number {
  const a = parseWalletApiVersion(left);
  const b = parseWalletApiVersion(right);
  if (!a || !b) throw new TypeError("Invalid Wallet API version.");

  for (let index = 0; index < 3; index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return Math.sign(difference);
  }
  return 0;
}

export function assessWalletApiVersions(versions: readonly string[]): WalletCapability {
  const supportedVersions = versions.filter(
    (version) => parseWalletApiVersion(version) !== null,
  );
  const supported = supportedVersions.some(
    (version) => compareWalletApiVersions(version, MINIMUM_WALLET_API_VERSION) >= 0,
  );

  return {
    supported,
    minimumVersion: MINIMUM_WALLET_API_VERSION,
    supportedVersions,
    reason: supported
      ? null
      : `Wallet API ${MINIMUM_WALLET_API_VERSION} or newer is required for STRK20.`,
  };
}

export async function detectWalletCapability(
  wallet: WalletWithStarknetFeatures,
): Promise<WalletCapability> {
  try {
    const versions = await walletV6.supportedWalletApi(wallet);
    return assessWalletApiVersions(versions);
  } catch {
    return {
      supported: false,
      minimumVersion: MINIMUM_WALLET_API_VERSION,
      supportedVersions: [],
      reason: "This wallet did not expose compatible STRK20 Wallet API capabilities.",
    };
  }
}
