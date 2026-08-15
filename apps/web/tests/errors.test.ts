import { describe, expect, it } from "vitest";

import {
  createRedactedDiagnostic,
  toSafeWalletError,
} from "../lib/strk20/errors";

describe("wallet error redaction", () => {
  it.each([
    [113, "USER_REJECTED"],
    [118, "NOT_REGISTERED"],
    [119, "INSUFFICIENT_PRIVATE_BALANCE"],
    [120, "PRIVACY_CHECK_FAILED"],
    [162, "UNSUPPORTED_WALLET_API"],
    [163, "UNKNOWN_WALLET_ERROR"],
  ] as const)("maps Wallet API error %s without retaining its payload", (code, expected) => {
    const mapped = toSafeWalletError({
      code,
      message: "recipient 0x0123456789abcdef amount 123.456 private note secret",
    });
    expect(mapped.code).toBe(expected);
    expect(mapped.message).not.toContain("0x0123456789abcdef");
    expect(mapped.message).not.toContain("123.456");
    expect(JSON.stringify(mapped)).not.toContain("private note secret");
  });

  it("exports only allowlisted diagnostic fields", () => {
    const diagnostic = createRedactedDiagnostic({
      error: new Error("RPC failed for 0xdeadbeef and amount 42"),
      stage: "BALANCE_READ",
      walletApiSupported: true,
      now: new Date("2026-08-15T00:00:00.000Z"),
    });

    expect(diagnostic).toEqual({
      appVersion: "0.1.0",
      network: "SN_MAIN",
      walletApiSupported: true,
      stage: "BALANCE_READ",
      errorCode: "RPC_UNAVAILABLE",
      timestamp: "2026-08-15T00:00:00.000Z",
    });
    expect(JSON.stringify(diagnostic)).not.toContain("deadbeef");
    expect(JSON.stringify(diagnostic)).not.toContain("amount 42");
  });
});
