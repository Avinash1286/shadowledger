import { hash } from "starknet";
import { describe, expect, it } from "vitest";

import {
  createRunCalldata,
  decodePayrollRun,
  hasRegistryEvent,
  REGISTRY_STATUS,
} from "../lib/registry/client";

describe("payroll registry client", () => {
  it("decodes the Cairo PayrollRun layout without losing integer precision", () => {
    const run = decodePayrollRun(0x20n, [
      "0x123", "0x456", "340282366920938463463374607431768211455", "5",
      "0x11", "0x22", "0x33", "0x44", "100", "200", "2",
    ]);
    expect(run.runId).toBe("0x20");
    expect(run.aggregateAmount).toBe((1n << 128n) - 1n);
    expect(run.status).toBe(REGISTRY_STATUS.finalized);
  });

  it("rejects malformed state and invalid create limits", () => {
    expect(() => decodePayrollRun(1n, ["0x1"])).toThrow(/malformed/u);
    expect(() => createRunCalldata({
      runId: 1n, token: "0x1", aggregateAmount: 1n, recipientCount: 6,
      periodHash: 1n, merkleRoot: 2n, manifestHash: 3n,
    })).toThrow(/between 1 and 5/u);
  });

  it("binds confirmation to contract, selector, and run id", () => {
    const registry = "0xabc";
    const receipt = { events: [{
      from_address: registry,
      keys: [hash.getSelectorFromName("PayrollRunCreated"), "0x99", "0x123"],
      data: [],
    }] };
    expect(hasRegistryEvent(receipt, registry, "PayrollRunCreated", 0x99n)).toBe(true);
    expect(hasRegistryEvent(receipt, registry, "PayrollRunFinalized", 0x99n)).toBe(false);
    expect(hasRegistryEvent(receipt, registry, "PayrollRunCreated", 0x98n)).toBe(false);
    expect(hasRegistryEvent(receipt, "0xdef", "PayrollRunCreated", 0x99n)).toBe(false);
  });
});
