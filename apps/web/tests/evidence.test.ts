import { describe, expect, it } from "vitest";

import { assessPoolTransactionReceipt } from "../lib/strk20/evidence";

const POOL = "0x40337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a";

const ELIGIBLE_RECEIPT = {
  execution_status: "SUCCEEDED",
  finality_status: "ACCEPTED_ON_L2",
  events: [{ from_address: POOL }],
};

describe("STRK20 transaction evidence", () => {
  it("accepts only a succeeded, accepted receipt with a pool-origin event", () => {
    expect(assessPoolTransactionReceipt(ELIGIBLE_RECEIPT, POOL)).toEqual({
      eligible: true,
      executionSucceeded: true,
      acceptedOnchain: true,
      poolEventFound: true,
    });
  });

  it.each([
    { ...ELIGIBLE_RECEIPT, execution_status: "REVERTED" },
    { ...ELIGIBLE_RECEIPT, finality_status: "RECEIVED" },
    { ...ELIGIBLE_RECEIPT, events: [] },
    { ...ELIGIBLE_RECEIPT, events: [{ from_address: "0x123" }] },
    null,
  ])("rejects incomplete or unrelated evidence %#", (receipt) => {
    expect(assessPoolTransactionReceipt(receipt, POOL).eligible).toBe(false);
  });

  it("compares padded and unpadded pool addresses by felt value", () => {
    const shortPool = "0x1";
    const paddedPool = `0x${"0".repeat(63)}1`;
    const receipt = { ...ELIGIBLE_RECEIPT, events: [{ from_address: paddedPool }] };

    expect(assessPoolTransactionReceipt(receipt, shortPool).poolEventFound).toBe(true);
  });
});
