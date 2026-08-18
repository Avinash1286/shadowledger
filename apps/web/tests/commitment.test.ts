import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildPayrollCommitment,
  buildPayrollTree,
  canonicalizeManifest,
  computeManifestHash,
  computePayrollLeaf,
  computeRunId,
  generateUniqueSalts,
  MAX_U128,
} from "../lib/payroll/commitment";
import { DOMAIN_FELTS, EMPTY_LEAF_V1, hashLocalText } from "../lib/payroll/hashing";
import {
  buildMerkleTree,
  createMerkleProof,
  verifyMerkleProof,
} from "../lib/payroll/merkle";
import type { ValidatedPayrollRow } from "../lib/payroll/types";
import { parsePayrollCsv } from "../lib/payroll/csv";

const TOKEN = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
const FIXED_TIME = "2026-08-18T00:00:00.000Z";
const parsedFixture = parsePayrollCsv(
  readFileSync(resolve(process.cwd(), "public/demo-payroll.csv"), "utf8"),
  18,
);
if (parsedFixture.errors.length > 0) throw new Error("Demo payroll fixture is invalid.");
const ROWS: ValidatedPayrollRow[] = parsedFixture.rows;

function fixedCommitment() {
  return buildPayrollCommitment({
    rows: ROWS,
    organization: "0xabc",
    organizationRunNonce: 7n,
    token: TOKEN,
    tokenDecimals: 18,
    period: "2026-08",
    createdAt: FIXED_TIME,
    salts: [1n, 2n, 3n],
  });
}

describe("domain-separated payroll commitment", () => {
  it("builds deterministic domain felts and fixture outputs", () => {
    const commitment = fixedCommitment();
    expect(DOMAIN_FELTS).toEqual({
      RUN: 0x534841444f574c45444745525f52554e5f5631n,
      LEAF: 0x534841444f574c45444745525f4c4541465f5631n,
      NODE: 0x534841444f574c45444745525f4e4f44455f5631n,
      MANIFEST: 0x534841444f574c45444745525f4d414e49464553545f5631n,
      RECEIPT: 0x534841444f574c45444745525f524543454950545f5631n,
      EMPTY_LEAF: 0x534841444f574c45444745525f454d5054595f4c4541465f5631n,
    });
    expect(EMPTY_LEAF_V1).toBe(0xbb049a3a1c614064cae43d74aa940bb779721e32369ea3bd1541292387732bn);
    expect(commitment.runId).toBe(0x3c35879c4e0ad00b1fc249d861ba8d9e374e23a8cc38b20eead8e07d49e474en);
    expect(commitment.leaves).toEqual([
      0x680820089c32a132ca3ad009cac4ac18c0757681eb7807970abe3e1dd46a6b5n,
      0x3347d4936c8dd0f92b7c07bf17a6a93fec66a20b85dd96b69baaf2ef02c7509n,
      0x28515879e13bf9f3c95bd0af9de4c1e254a317a216c0f697890a77495ab3487n,
    ]);
    expect(commitment.merkleRoot).toBe(0x7187c01b51d5ad9e2ea6c880824b086399c398df1f21949ff8ec64a6075d72fn);
    expect(commitment.manifestHash).toBe(0x5e25a2ffb9cf9722be695a1657c097bd2e0bdafe38e5c8872a43c43f57def6fn);
  });

  it("verifies every demo row against one positional root", () => {
    const commitment = fixedCommitment();
    commitment.leaves.forEach((leaf, index) => {
      expect(verifyMerkleProof(leaf, commitment.proofs[index]!, commitment.merkleRoot)).toBe(true);
    });
    expect(commitment.proofs[0]?.directions).toEqual(["right", "right"]);
    expect(commitment.proofs[1]?.directions).toEqual(["left", "right"]);
    expect(commitment.proofs[2]?.directions).toEqual(["right", "left"]);
  });

  it("rejects a changed amount, recipient, memo, or salt", () => {
    const commitment = fixedCommitment();
    const entry = commitment.entries[0]!;
    const proof = commitment.proofs[0]!;
    const mutations = [
      { ...entry, amount: entry.amount + 1n },
      { ...entry, recipient: "0x123" as const },
      { ...entry, memoHash: hashLocalText("Changed memo") },
      { ...entry, salt: entry.salt + 1n },
    ];
    mutations.forEach((mutation) => {
      expect(verifyMerkleProof(
        computePayrollLeaf(mutation, commitment.runId),
        proof,
        commitment.merkleRoot,
      )).toBe(false);
    });
  });

  it("rejects an invalid sibling and wrong direction", () => {
    const commitment = fixedCommitment();
    const proof = commitment.proofs[0]!;
    expect(verifyMerkleProof(commitment.leaves[0]!, {
      siblings: [proof.siblings[0]! + 1n, ...proof.siblings.slice(1)],
      directions: proof.directions,
    }, commitment.merkleRoot)).toBe(false);
    expect(verifyMerkleProof(commitment.leaves[0]!, {
      siblings: proof.siblings,
      directions: ["left", ...proof.directions.slice(1)],
    }, commitment.merkleRoot)).toBe(false);
  });

  it("pads three leaves with the documented empty leaf", () => {
    const commitment = fixedCommitment();
    const tree = buildMerkleTree(commitment.leaves);
    expect(tree.layers[0]).toEqual([...commitment.leaves, EMPTY_LEAF_V1]);
    expect(createMerkleProof(tree, 2)).toEqual(commitment.proofs[2]);
  });

  it("binds the run ID to organization, period, and nonce", () => {
    const commitment = fixedCommitment();
    expect(computeRunId({
      organization: 0xabcn,
      periodHash: commitment.periodHash,
      nonce: 8n,
    })).not.toBe(commitment.runId);
  });

  it("canonicalizes the public manifest independently of object insertion order", () => {
    const commitment = fixedCommitment();
    const reordered = {
      createdAt: commitment.manifest.createdAt,
      leafVersion: commitment.manifest.leafVersion,
      hashAlgorithm: commitment.manifest.hashAlgorithm,
      merkleRoot: commitment.manifest.merkleRoot,
      periodHash: commitment.manifest.periodHash,
      recipientCount: commitment.manifest.recipientCount,
      aggregateAmount: commitment.manifest.aggregateAmount,
      tokenDecimals: commitment.manifest.tokenDecimals,
      token: commitment.manifest.token,
      runId: commitment.manifest.runId,
      network: commitment.manifest.network,
      schema: commitment.manifest.schema,
    };
    expect(canonicalizeManifest(reordered)).toBe(commitment.canonicalManifest);
    expect(computeManifestHash(commitment.canonicalManifest)).toBe(commitment.manifestHash);
    expect(commitment.canonicalManifest).not.toContain("recipient\"");
    expect(commitment.canonicalManifest).not.toContain("salt");
    expect(commitment.canonicalManifest).not.toContain("memo");
  });

  it("sorts explicit indices and rejects duplicate indices or recipients", () => {
    const commitment = fixedCommitment();
    const reversed = buildPayrollTree([...commitment.entries].reverse(), commitment.runId);
    expect(reversed.entries.map((entry) => entry.index)).toEqual([0, 1, 2]);
    expect(reversed.merkleRoot).toBe(commitment.merkleRoot);
    expect(() => buildPayrollTree([
      commitment.entries[0]!,
      { ...commitment.entries[1]!, index: 0 },
    ], commitment.runId)).toThrow("Duplicate payroll entry index");
    expect(() => buildPayrollTree([
      commitment.entries[0]!,
      { ...commitment.entries[1]!, recipient: commitment.entries[0]!.recipient },
    ], commitment.runId)).toThrow("Duplicate recipient");
  });

  it("uses unique, non-zero 248-bit random salts", () => {
    const salts = generateUniqueSalts(32);
    expect(new Set(salts).size).toBe(32);
    salts.forEach((salt) => {
      expect(salt).toBeGreaterThan(0n);
      expect(salt).toBeLessThan(1n << 248n);
    });
  });

  it("rejects non-u128 entries", () => {
    const commitment = fixedCommitment();
    expect(() => computePayrollLeaf({ ...commitment.entries[0]!, amount: MAX_U128 + 1n }, commitment.runId))
      .toThrow("unsigned 128-bit");
  });

  it("rejects an aggregate that exceeds u128", () => {
    expect(() => buildPayrollCommitment({
      rows: [
        { ...ROWS[0]!, amountUnits: MAX_U128 },
        { ...ROWS[1]!, amountUnits: 1n },
      ],
      organization: "0xabc",
      organizationRunNonce: 7n,
      token: TOKEN,
      tokenDecimals: 18,
      period: "2026-08",
      createdAt: FIXED_TIME,
      salts: [1n, 2n],
    })).toThrow("Aggregate amount must fit an unsigned 128-bit integer");
  });
});
