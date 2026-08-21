import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Account, RpcProvider, hash, json, num } from "starknet";

const RPC_URL = process.env.SHADOWLEDGER_DEVNET_RPC_URL ?? "http://127.0.0.1:5050/rpc";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SIERRA_PATH = path.join(
  ROOT,
  "contracts/target/dev/shadowledger_registry_PayrollRegistry.contract_class.json",
);
const CASM_PATH = path.join(
  ROOT,
  "contracts/target/dev/shadowledger_registry_PayrollRegistry.compiled_contract_class.json",
);
const OUTPUT_PATH = path.join(ROOT, "contracts/deployments/devnet.json");

const TEST_RUN = {
  runId: "0x2026082001",
  token: "0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
  aggregateAmount: "3000000000000000000",
  recipientCount: 3,
  periodHash: "0x202608",
  merkleRoot: "0x20260820a1",
  manifestHash: "0x20260820b2",
  strk20TxHash: "0x20260820c3",
};

function rpcRequest(method, params = []) {
  return fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: method, method, params }),
  }).then(async (response) => {
    if (!response.ok) throw new Error(`Devnet RPC returned HTTP ${response.status}.`);
    const payload = await response.json();
    if (payload.error) throw new Error(`${method} failed: ${JSON.stringify(payload.error)}`);
    return payload.result;
  });
}

function receiptEvents(receipt) {
  const raw = receipt && typeof receipt === "object" && "value" in receipt ? receipt.value : receipt;
  return Array.isArray(raw?.events) ? raw.events : [];
}

function assertEvent(receipt, contractAddress, eventName) {
  const selector = num.toHex(hash.getSelectorFromName(eventName)).toLowerCase();
  const expectedAddress = BigInt(contractAddress);
  const found = receiptEvents(receipt).some((event) =>
    BigInt(event.from_address ?? event.fromAddress ?? 0) === expectedAddress
      && Array.isArray(event.keys)
      && event.keys.some((key) => num.toHex(key).toLowerCase() === selector),
  );
  if (!found) throw new Error(`${eventName} was not emitted by the deployed registry.`);
}

async function main() {
  const [chainId, accounts, sierraText, casmText] = await Promise.all([
    rpcRequest("starknet_chainId"),
    rpcRequest("devnet_getPredeployedAccounts", { with_balance: true }),
    readFile(SIERRA_PATH, "utf8"),
    readFile(CASM_PATH, "utf8"),
  ]);
  const developer = accounts[0];
  if (!developer?.address || !developer?.private_key) {
    throw new Error("Devnet did not expose a funded development account.");
  }

  const provider = new RpcProvider({ nodeUrl: RPC_URL });
  const account = new Account({
    provider,
    address: developer.address,
    signer: developer.private_key,
  });
  const deployment = await account.declareAndDeploy({
    contract: json.parse(sierraText),
    casm: json.parse(casmText),
    addressSalt: "0x20260820",
    unique: true,
  });
  const contractAddress = deployment.deploy.contract_address;

  const create = await account.execute({
    contractAddress,
    entrypoint: "create_run",
    calldata: [
      TEST_RUN.runId,
      TEST_RUN.token,
      TEST_RUN.aggregateAmount,
      TEST_RUN.recipientCount,
      TEST_RUN.periodHash,
      TEST_RUN.merkleRoot,
      TEST_RUN.manifestHash,
    ],
  });
  const createReceipt = await provider.waitForTransaction(create.transaction_hash);
  assertEvent(createReceipt, contractAddress, "PayrollRunCreated");

  const finalize = await account.execute({
    contractAddress,
    entrypoint: "finalize_run",
    calldata: [TEST_RUN.runId, TEST_RUN.strk20TxHash],
  });
  const finalizeReceipt = await provider.waitForTransaction(finalize.transaction_hash);
  assertEvent(finalizeReceipt, contractAddress, "PayrollRunFinalized");

  const stored = await provider.callContract({
    contractAddress,
    entrypoint: "get_run",
    calldata: [TEST_RUN.runId],
  });
  if (stored.length !== 11 || BigInt(stored[10]) !== 2n) {
    throw new Error("The development run was not finalized in registry storage.");
  }
  if (BigInt(stored[0]) !== BigInt(developer.address)) {
    throw new Error("The stored owner does not match the development account.");
  }

  const evidence = {
    schemaVersion: 1,
    environment: "local-starknet-devnet",
    chainId,
    rpcUrl: RPC_URL,
    developerAccount: developer.address,
    classHash: num.toHex(deployment.declare.class_hash),
    contractAddress,
    declareTransactionHash: deployment.declare.transaction_hash ?? null,
    deployTransactionHash: deployment.deploy.transaction_hash,
    createTransactionHash: create.transaction_hash,
    finalizeTransactionHash: finalize.transaction_hash,
    verifiedEvents: ["PayrollRunCreated", "PayrollRunFinalized"],
    storedStatus: Number(BigInt(stored[10])),
    testRun: TEST_RUN,
  };
  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
