export const SN_MAIN = "SN_MAIN" as const;
export const SN_MAIN_HEX = "0x534e5f4d41494e" as const;

function stripHexLeadingZeroes(value: string): string {
  const stripped = value.toLowerCase().replace(/^0x0*/, "0x");
  return stripped === "0x" ? "0x0" : stripped;
}

export function normalizeChainId(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const withoutNamespace = trimmed.toLowerCase().startsWith("starknet:")
    ? trimmed.slice("starknet:".length)
    : trimmed;

  if (withoutNamespace.toUpperCase() === SN_MAIN) return SN_MAIN;

  if (/^0x[0-9a-fA-F]+$/.test(withoutNamespace)) {
    if (stripHexLeadingZeroes(withoutNamespace) === stripHexLeadingZeroes(SN_MAIN_HEX)) {
      return SN_MAIN;
    }
    return withoutNamespace.toLowerCase();
  }

  return withoutNamespace.toUpperCase();
}

export function isMainnetChainId(value: unknown): boolean {
  return normalizeChainId(value) === SN_MAIN;
}

export class MainnetRequiredError extends Error {
  readonly code = "WRONG_NETWORK" as const;

  constructor() {
    super("ShadowLedger requires Starknet mainnet.");
    this.name = "MainnetRequiredError";
  }
}

export function assertMainnetChain(value: unknown): asserts value is string {
  if (!isMainnetChainId(value)) throw new MainnetRequiredError();
}
