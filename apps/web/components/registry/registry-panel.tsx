"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";

import {
  cancelRegistryRun,
  createRegistryRun,
  finalizeRegistryRun,
} from "@/lib/registry/client";
import { useWalletStore } from "@/lib/stores/wallet-store";

function felt(value: string, label: string): bigint {
  try {
    const parsed = BigInt(value.trim());
    if (parsed <= 0n) throw new Error();
    return parsed;
  } catch {
    throw new Error(`${label} must be a positive decimal or 0x-prefixed felt.`);
  }
}

export function RegistryPanel(props: {
  registryAddress: `0x${string}`;
  tokenAddress: `0x${string}`;
}) {
  const session = useWalletStore((state) => state.session);
  const [runId, setRunId] = useState("0x20260821");
  const [amount, setAmount] = useState("1000000000000000");
  const [count, setCount] = useState("1");
  const [periodHash, setPeriodHash] = useState("0x202608");
  const [merkleRoot, setMerkleRoot] = useState("0x2026082101");
  const [manifestHash, setManifestHash] = useState("0x2026082102");
  const [strk20TxHash, setStrk20TxHash] = useState("0x2026082103");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function perform(action: "create" | "finalize" | "cancel") {
    if (!session) throw new Error("Connect a supported mainnet wallet below first.");
    const parsedRunId = felt(runId, "Run ID");
    if (action === "create") {
      return createRegistryRun({
        session,
        registryAddress: props.registryAddress,
        run: {
          runId: parsedRunId,
          token: props.tokenAddress,
          aggregateAmount: felt(amount, "Aggregate amount"),
          recipientCount: Number(count),
          periodHash: felt(periodHash, "Period hash"),
          merkleRoot: felt(merkleRoot, "Merkle root"),
          manifestHash: felt(manifestHash, "Manifest hash"),
        },
      });
    }
    if (action === "finalize") {
      return finalizeRegistryRun({
        session,
        registryAddress: props.registryAddress,
        runId: parsedRunId,
        strk20TxHash: felt(strk20TxHash, "STRK20 transaction hash"),
      });
    }
    return cancelRegistryRun({ session, registryAddress: props.registryAddress, runId: parsedRunId });
  }

  async function submit(event: FormEvent<HTMLFormElement>, action: "create" | "finalize" | "cancel") {
    event.preventDefault();
    await submitAction(action);
  }

  async function submitAction(action: "create" | "finalize" | "cancel") {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await perform(action);
      setMessage(`${result.eventName} confirmed and registry status verified. Transaction ${result.transactionHash}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The registry transaction failed safely.");
    } finally {
      setBusy(false);
    }
  }

  let publicHref = "/runs/invalid";
  try { publicHref = `/runs/0x${felt(runId, "Run ID").toString(16)}`; } catch { /* form remains editable */ }

  return (
    <form className="panel" onSubmit={(event) => submit(event, "create")}>
      <p className="section-kicker">Registry control</p>
      <h2>Create, finalize, or cancel</h2>
      <p className="panel-copy">Every action waits for its event, then reads state back before reporting success.</p>
      <div className="field"><label htmlFor="run-id">Run ID</label><input id="run-id" value={runId} onChange={(event) => setRunId(event.target.value)} /></div>
      <div className="field"><label htmlFor="aggregate">Aggregate base units</label><input id="aggregate" value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
      <div className="field"><label htmlFor="count">Recipient count (1–5)</label><input id="count" type="number" min="1" max="5" value={count} onChange={(event) => setCount(event.target.value)} /></div>
      <div className="field"><label htmlFor="period">Period hash</label><input id="period" value={periodHash} onChange={(event) => setPeriodHash(event.target.value)} /></div>
      <div className="field"><label htmlFor="root">Merkle root</label><input id="root" value={merkleRoot} onChange={(event) => setMerkleRoot(event.target.value)} /></div>
      <div className="field"><label htmlFor="manifest">Manifest hash</label><input id="manifest" value={manifestHash} onChange={(event) => setManifestHash(event.target.value)} /></div>
      <div className="field"><label htmlFor="tx-hash">STRK20 transaction hash</label><input id="tx-hash" value={strk20TxHash} onChange={(event) => setStrk20TxHash(event.target.value)} /></div>
      <div className="action-row">
        <button className="primary-button" disabled={busy} type="submit">Create run</button>
        <button className="secondary-button" disabled={busy} type="button" onClick={() => void submitAction("finalize")}>Finalize</button>
        <button className="secondary-button" disabled={busy} type="button" onClick={() => void submitAction("cancel")}>Cancel</button>
      </div>
      <p className="notice"><Link href={publicHref}>Open this run’s public view</Link></p>
      {message && <p className="notice success">{message}</p>}
      {error && <p className="notice error">{error}</p>}
    </form>
  );
}
