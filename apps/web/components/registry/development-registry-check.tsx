"use client";

import { useState } from "react";

type Evidence = {
  contractAddress: string;
  runId: string;
  createTransactionHash: string;
  finalizeTransactionHash: string;
  verifiedEvents: string[];
  storedStatus: number;
};

export function DevelopmentRegistryCheck() {
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/development/registry-test", { method: "POST" });
      const result = await response.json() as Evidence & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Development registry verification failed.");
      setEvidence(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Development registry verification failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel devnet-check">
      <p className="section-kicker">Local Starknet Devnet</p>
      <h2>Run the app-to-contract proof</h2>
      <p className="panel-copy">Development only: create and finalize a fresh tiny run, verify both receipts, then read status 2 from storage.</p>
      <button className="secondary-button" disabled={busy} type="button" onClick={() => void run()}>{busy ? "Confirming on Devnet…" : "Create and finalize test run"}</button>
      {evidence && (
        <ul className="detail-list">
          <li><span>Run ID</span><strong>{evidence.runId}</strong></li>
          <li><span>Verified events</span><strong>{evidence.verifiedEvents.join(", ")}</strong></li>
          <li><span>Stored status</span><strong className="good">{evidence.storedStatus} · Finalized</strong></li>
          <li><span>Create transaction</span><strong>{evidence.createTransactionHash}</strong></li>
          <li><span>Finalize transaction</span><strong>{evidence.finalizeTransactionHash}</strong></li>
        </ul>
      )}
      {error && <p className="notice error">{error}</p>}
    </section>
  );
}
