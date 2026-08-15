import { describe, expect, it } from "vitest";

import {
  assessWalletApiVersions,
  compareWalletApiVersions,
  parseWalletApiVersion,
} from "../lib/strk20/capabilities";

describe("Wallet API capability helpers", () => {
  it("parses two- and three-component versions", () => {
    expect(parseWalletApiVersion("0.10.3")).toEqual([0, 10, 3]);
    expect(parseWalletApiVersion("1.0")).toEqual([1, 0, 0]);
    expect(parseWalletApiVersion("v0.10.3")).toBeNull();
  });

  it("compares versions numerically rather than lexicographically", () => {
    expect(compareWalletApiVersions("0.10.3", "0.9.99")).toBe(1);
    expect(compareWalletApiVersions("0.10.2", "0.10.3")).toBe(-1);
    expect(compareWalletApiVersions("0.10.3", "0.10.3")).toBe(0);
  });

  it("requires at least Wallet API 0.10.3", () => {
    expect(assessWalletApiVersions(["0.10.2"]).supported).toBe(false);
    expect(assessWalletApiVersions(["0.9", "0.10.3"]).supported).toBe(true);
    expect(assessWalletApiVersions(["0.11.0"]).supported).toBe(true);
    expect(assessWalletApiVersions(["garbage"]).supportedVersions).toEqual([]);
  });
});
