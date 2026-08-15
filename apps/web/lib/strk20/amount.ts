export const MAX_FELT = (1n << 251n) - 1n;

export class AmountParseError extends Error {
  readonly code = "INVALID_AMOUNT" as const;

  constructor(message: string) {
    super(message);
    this.name = "AmountParseError";
  }
}

export function parseTokenAmount(
  input: string,
  decimals: number,
  maximum = MAX_FELT,
): bigint {
  const value = input.trim();
  if (!Number.isSafeInteger(decimals) || decimals < 0) {
    throw new AmountParseError("Token decimals are invalid.");
  }
  if (!/^\d+(?:\.\d+)?$/.test(value)) {
    throw new AmountParseError("Enter a positive decimal amount.");
  }

  const [whole = "0", fraction = ""] = value.split(".");
  if (fraction.length > decimals) {
    throw new AmountParseError(`Use no more than ${decimals} decimal places.`);
  }

  const units = BigInt(whole) * 10n ** BigInt(decimals) +
    BigInt(fraction.padEnd(decimals, "0") || "0");

  if (units <= 0n) throw new AmountParseError("Amount must be greater than zero.");
  if (units > maximum) throw new AmountParseError("Amount exceeds the safety limit.");

  return units;
}

export function formatTokenAmount(
  units: bigint,
  decimals: number,
  maximumFractionDigits = 6,
): string {
  const negative = units < 0n;
  const absolute = negative ? -units : units;
  const divisor = 10n ** BigInt(decimals);
  const whole = absolute / divisor;
  const fraction = absolute % divisor;

  if (fraction === 0n || maximumFractionDigits === 0) {
    return `${negative ? "-" : ""}${whole.toString()}`;
  }

  const fractionText = fraction
    .toString()
    .padStart(decimals, "0")
    .slice(0, maximumFractionDigits)
    .replace(/0+$/, "");

  return `${negative ? "-" : ""}${whole.toString()}${fractionText ? `.${fractionText}` : ""}`;
}
