export function isStarknetAddress(value: string): value is `0x${string}` {
  return /^0x[0-9a-fA-F]{1,64}$/.test(value);
}

export function addressesEqual(left: string, right: string): boolean {
  if (!isStarknetAddress(left) || !isStarknetAddress(right)) return false;

  try {
    return BigInt(left) === BigInt(right);
  } catch {
    return false;
  }
}

export function shortAddress(address: string): string {
  if (address.length <= 16) return address;
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}
