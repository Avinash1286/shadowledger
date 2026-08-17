const FORBIDDEN_PAYROLL_KEYS = new Set(["recipient", "amount", "memo", "salt"]);

export class PlaintextPayrollPayloadError extends Error {
  constructor(key: string) {
    super(`Plaintext payroll field \"${key}\" cannot leave this device.`);
    this.name = "PlaintextPayrollPayloadError";
  }
}

export function assertNoPlaintextPayrollPayload(value: unknown): void {
  const visited = new WeakSet<object>();

  function inspect(candidate: unknown): void {
    if (candidate === null || typeof candidate !== "object") return;
    if (visited.has(candidate)) return;
    visited.add(candidate);

    if (Array.isArray(candidate)) {
      candidate.forEach(inspect);
      return;
    }

    for (const [key, nestedValue] of Object.entries(candidate)) {
      if (FORBIDDEN_PAYROLL_KEYS.has(key.trim().toLowerCase())) {
        throw new PlaintextPayrollPayloadError(key);
      }
      inspect(nestedValue);
    }
  }

  inspect(value);
}
