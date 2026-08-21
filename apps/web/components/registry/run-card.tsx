"use client";

import { RpcProvider } from "starknet";
import { useEffect, useState } from "react";

import {
  readRegistryRun,
  registryStatusLabel,
  type PayrollRegistryRun,
} from "@/lib/registry/client";
import { shortAddress } from "@/lib/strk20/address";

export function RunCard(props: {
  rpcUrl: string;
  registryAddress: `0x${string}`;
  runId: bigint;
  refreshKey?: number;
}) {
  const [run, setRun] = useState<PayrollRegistryRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const provider = new RpcProvider({ nodeUrl: props.rpcUrl });
    readRegistryRun({ provider, registryAddress: props.registryAddress, runId: props.runId })
      .then((value) => { if (active) setRun(value); })
      .catch(() => { if (active) setError("This run could not be read from the configured registry."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [props.registryAddress, props.rpcUrl, props.runId, props.refreshKey]);

  if (loading) return <p className="notice">Reading the public registry…</p>;
  if (error) return <p className="notice error">{error}</p>;
  if (!run || run.status === 0) return <p className="notice warning">No payroll run exists for this identifier.</p>;

  return (
    <article className="panel">
      <p className="section-kicker">Public aggregate record</p>
      <h2>Run {run.runId}</h2>
      <p className="panel-copy">This page exposes commitments and totals—not recipient payroll rows.</p>
      <ul className="detail-list">
        <li><span>Status</span><strong className="good">{registryStatusLabel(run.status)}</strong></li>
        <li><span>Owner</span><strong title={run.owner}>{shortAddress(run.owner)}</strong></li>
        <li><span>Token</span><strong title={run.token}>{shortAddress(run.token)}</strong></li>
        <li><span>Aggregate units</span><strong>{run.aggregateAmount.toString()}</strong></li>
        <li><span>Recipients</span><strong>{run.recipientCount}</strong></li>
        <li><span>Period hash</span><strong>{run.periodHash}</strong></li>
        <li><span>Merkle root</span><strong>{run.merkleRoot}</strong></li>
        <li><span>Manifest hash</span><strong>{run.manifestHash}</strong></li>
        {run.status === 2 && <li><span>STRK20 transaction</span><strong>{run.strk20TxHash}</strong></li>}
      </ul>
    </article>
  );
}
