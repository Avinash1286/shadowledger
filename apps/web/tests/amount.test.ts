import { describe, expect, it } from "vitest";

import {
  AmountParseError,
  formatTokenAmount,
  parseTokenAmount,
} from "../lib/strk20/amount";

describe("token amount parsing", () => {
  it("converts a decimal STRK amount to exact smallest units", () => {
    expect(parseTokenAmount("0.001", 18)).toBe(1_000_000_000_000_000n);
    expect(parseTokenAmount("12.3400", 6)).toBe(12_340_000n);
  });

  it.each(["", "0", "-1", "1e3", ".5", "1.", "one"])(
    "rejects unsafe syntax: %s",
    (input) => {
      expect(() => parseTokenAmount(input, 18)).toThrow(AmountParseError);
    },
  );

  it("rejects excess precision and amounts beyond a caller safety cap", () => {
    expect(() => parseTokenAmount("0.0000001", 6)).toThrow(/decimal places/);
    expect(() => parseTokenAmount("1.01", 2, 100n)).toThrow(/safety limit/);
  });

  it("formats exact integer balances without floating point arithmetic", () => {
    expect(formatTokenAmount(1_234_567_890_000_000_000n, 18)).toBe("1.234567");
    expect(formatTokenAmount(2_000_000_000_000_000_000n, 18)).toBe("2");
  });
});
