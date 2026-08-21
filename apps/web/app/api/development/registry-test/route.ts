import { readFile } from "node:fs/promises";
import path from "node:path";

import { Account, RpcProvider, num } from "starknet";

import { hasRegistryEvent } from "@/lib/registry/client";

const RPC_URL = "http://127.0.0.1:5050/rpc";

type DevAccount = { address: string; private_key: string };
type DeploymentEvidence = { contractAddress: `0x${string}` };

async function rpcRequest<T>(method: string, params: unknown): Promise<T> {
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: method, method, params }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Devnet RPC returned HTTP ${response.status}.`);
  const payload = await response.json() as { result?: T; error?: unknown };
  if (payload.error || payload.result === undefined) throw new Error(`${method} failed.`);
  return payload.result;
}

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ error: "Not found." }, { status: 404 });
  }
  try {
    const evidencePath = path.resolve(process.cwd(), "../../contracts/deployments/devnet.json");
    const evidence = JSON.parse(await readFile(evidencePath, "utf8")) as DeploymentEvidence;
    const accounts = await rpcRequest<DevAccount[]>("devnet_getPredeployedAccounts", { with_balance: true });
    const developer = accounts[0];
    if (!developer?.address || !developer.private_key) throw new Error("No funded Devnet account is available.");

    const provider = new RpcProvider({ nodeUrl: RPC_URL });
    const account = new Account({ provider, address: developer.address, signer: developer.private_key });
    const runId = BigInt(Date.now());
    const run = {
      runId,
      token: "0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
      aggregateAmount: 2_000_000_000_000_000n,
      recipientCount: 2,
      periodHash: 0x202608n,
      merkleRoot: runId + 1n,
      manifestHash: runId + 2n,
      strk20TxHash: runId + 3n,
    };
    const create = await account.execute({
      contractAddress: evidence.contractAddress,
      entrypoint: "create_run",
      calldata: [run.runId, run.token, run.aggregateAmount, run.recipientCount, run.periodHash, run.merkleRoot, run.manifestHash].map(num.toHex),
    });
    const createReceipt = await provider.waitForTransaction(create.transaction_hash);
    if (!hasRegistryEvent(createReceipt, evidence.contractAddress, "PayrollRunCreated", runId)) throw new Error("Create event verification failed.");

    const finalize = await account.execute({
      contractAddress: evidence.contractAddress,
      entrypoint: "finalize_run",
      calldata: [num.toHex(runId), num.toHex(run.strk20TxHash)],
    });
    const finalizeReceipt = await provider.waitForTransaction(finalize.transaction_hash);
    if (!hasRegistryEvent(finalizeReceipt, evidence.contractAddress, "PayrollRunFinalized", runId)) throw new Error("Finalize event verification failed.");
    const stored = await provider.callContract({
      contractAddress: evidence.contractAddress,
      entrypoint: "get_run",
      calldata: [num.toHex(runId)],
    });
    if (stored.length !== 11 || BigInt(stored[10]!) !== 2n) throw new Error("Final registry state verification failed.");

    return Response.json({
      contractAddress: evidence.contractAddress,
      runId: num.toHex(runId),
      createTransactionHash: create.transaction_hash,
      finalizeTransactionHash: finalize.transaction_hash,
      verifiedEvents: ["PayrollRunCreated", "PayrollRunFinalized"],
      storedStatus: 2,
    });
  } catch (cause) {
    return Response.json({ error: cause instanceof Error ? cause.message : "Development verification failed." }, { status: 500 });
  }
}
