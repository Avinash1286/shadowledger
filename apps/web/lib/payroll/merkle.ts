import type { MerkleProof } from "@/lib/payroll/commitment-types";
import { DOMAIN_FELTS, EMPTY_LEAF_V1, poseidonHash } from "@/lib/payroll/hashing";

export type MerkleTree = {
  root: bigint;
  layers: bigint[][];
  originalLeafCount: number;
};

function nextPowerOfTwo(value: number): number {
  let result = 1;
  while (result < value) result *= 2;
  return result;
}

export function hashMerkleNode(left: bigint, right: bigint): bigint {
  return poseidonHash([DOMAIN_FELTS.NODE, left, right]);
}

export function buildMerkleTree(leaves: readonly bigint[]): MerkleTree {
  if (leaves.length === 0) throw new Error("A Merkle tree requires at least one leaf.");

  const padded = [...leaves];
  const paddedLength = nextPowerOfTwo(leaves.length);
  while (padded.length < paddedLength) padded.push(EMPTY_LEAF_V1);

  const layers = [padded];
  let current = padded;
  while (current.length > 1) {
    const parentLayer: bigint[] = [];
    for (let index = 0; index < current.length; index += 2) {
      const left = current[index];
      const right = current[index + 1];
      if (left === undefined || right === undefined) {
        throw new Error("Merkle padding invariant failed.");
      }
      parentLayer.push(hashMerkleNode(left, right));
    }
    layers.push(parentLayer);
    current = parentLayer;
  }

  const root = current[0];
  if (root === undefined) throw new Error("Merkle root generation failed.");
  return { root, layers, originalLeafCount: leaves.length };
}

export function createMerkleProof(tree: MerkleTree, leafIndex: number): MerkleProof {
  if (!Number.isSafeInteger(leafIndex) || leafIndex < 0 || leafIndex >= tree.originalLeafCount) {
    throw new Error("Merkle proof index is out of range.");
  }

  const siblings: bigint[] = [];
  const directions: MerkleProof["directions"] = [];
  let index = leafIndex;

  for (let level = 0; level < tree.layers.length - 1; level += 1) {
    const layer = tree.layers[level];
    if (!layer) throw new Error("Merkle layer is missing.");
    const siblingIsLeft = index % 2 === 1;
    const siblingIndex = siblingIsLeft ? index - 1 : index + 1;
    const sibling = layer[siblingIndex];
    if (sibling === undefined) throw new Error("Merkle sibling is missing.");
    siblings.push(sibling);
    directions.push(siblingIsLeft ? "left" : "right");
    index = Math.floor(index / 2);
  }

  return { siblings, directions };
}

export function verifyMerkleProof(
  leaf: bigint,
  proof: MerkleProof,
  expectedRoot: bigint,
): boolean {
  if (proof.siblings.length !== proof.directions.length) return false;

  let current = leaf;
  for (let index = 0; index < proof.siblings.length; index += 1) {
    const sibling = proof.siblings[index];
    const direction = proof.directions[index];
    if (sibling === undefined || direction === undefined) return false;
    current = direction === "left"
      ? hashMerkleNode(sibling, current)
      : hashMerkleNode(current, sibling);
  }
  return current === expectedRoot;
}
