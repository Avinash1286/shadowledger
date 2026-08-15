import { describe, expect, it } from "vitest";

import { SafeWalletError } from "../lib/strk20/errors";
import { privateTransferAction } from "../lib/strk20/private-transfer";

const TOKEN = "0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d" as const;

describe("private transfer action", () => {
  it("encodes a tiny STRK amount in base-unit hex and normalizes the recipient", () => {
    expect(
      privateTransferAction({
        tokenAddress: TOKEN,
        recipient: "0x123",
        amount: 1_000_000_000_000_000n,
      }),
    ).toEqual({
      type: "transfer",
      token: TOKEN,
      amount: "0x38d7ea4c68000",
      recipient:
        "0x0000000000000000000000000000000000000000000000000000000000000123",
    });
  });

  it.each([
    { recipient: "not-an-address", amount: 1n, code: "INVALID_RECIPIENT" },
    { recipient: "0x0", amount: 1n, code: "INVALID_RECIPIENT" },
    { recipient: "0x123", amount: 0n, code: "INVALID_AMOUNT" },
    { recipient: "0x123", amount: -1n, code: "INVALID_AMOUNT" },
  ] as const)("rejects unsafe input %#", ({ recipient, amount, code }) => {
    try {
      privateTransferAction({ tokenAddress: TOKEN, recipient, amount });
      throw new Error("Expected privateTransferAction to reject");
    } catch (error) {
      expect(error).toBeInstanceOf(SafeWalletError);
      expect((error as SafeWalletError).code).toBe(code);
    }
  });
});
