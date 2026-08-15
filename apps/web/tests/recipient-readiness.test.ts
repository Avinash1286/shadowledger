import { describe, expect, it } from "vitest";

import {
  assessRecipientReadiness,
  type RecipientReadinessInput,
} from "../lib/strk20/recipient-readiness";

const READY_INPUT: RecipientReadinessInput = {
  configurationValid: true,
  discoveryReady: true,
  walletDiscovered: true,
  connected: true,
  mainnet: true,
  capabilitySupported: true,
  registration: "registered",
};

describe("recipient readiness", () => {
  it.each([
    [{ configurationValid: false }, "configuration-blocked"],
    [{ connected: false, discoveryReady: false }, "discovering-wallets"],
    [
      { connected: false, discoveryReady: true, walletDiscovered: false },
      "wallet-not-installed",
    ],
    [{ connected: false }, "wallet-not-connected"],
    [{ mainnet: false }, "wrong-network"],
    [{ capabilitySupported: null }, "checking-capability"],
    [{ capabilitySupported: false }, "privacy-unsupported"],
    [{ registration: "unchecked" }, "registration-unchecked"],
    [{ registration: "checking" }, "checking-registration"],
    [{ registration: "not-registered" }, "activation-required"],
    [{ registration: "check-failed" }, "registration-unverified"],
    [{ registration: "registered" }, "ready"],
  ] as const)("maps %o to %s", (overrides, expectedCode) => {
    expect(assessRecipientReadiness({ ...READY_INPUT, ...overrides }).code).toBe(
      expectedCode,
    );
  });

  it("only marks a fully checked, registered account as ready", () => {
    const result = assessRecipientReadiness(READY_INPUT);

    expect(result.ready).toBe(true);
    expect(result.tone).toBe("success");

    for (const registration of [
      "unchecked",
      "checking",
      "not-registered",
      "check-failed",
    ] as const) {
      expect(
        assessRecipientReadiness({ ...READY_INPUT, registration }).ready,
      ).toBe(false);
    }
  });

  it("prioritizes invalid configuration over optimistic wallet state", () => {
    const result = assessRecipientReadiness({
      ...READY_INPUT,
      configurationValid: false,
    });

    expect(result).toMatchObject({
      code: "configuration-blocked",
      ready: false,
      tone: "danger",
    });
  });

  it("does not require discovery to remain active after a wallet is connected", () => {
    expect(
      assessRecipientReadiness({
        ...READY_INPUT,
        discoveryReady: false,
        walletDiscovered: false,
      }).code,
    ).toBe("ready");
  });
});
