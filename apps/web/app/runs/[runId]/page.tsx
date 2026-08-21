import Link from "next/link";

import { RunCard } from "@/components/registry/run-card";
import { readPublicConfig } from "@/lib/config";

export default async function PublicRunPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const result = readPublicConfig();
  let parsedRunId: bigint | null = null;
  try { parsedRunId = BigInt(runId.startsWith("0x") ? runId : `0x${runId}`); } catch { parsedRunId = null; }

  return (
    <main>
      <header className="hero shell compact-hero">
        <p className="eyebrow"><span className="signal" /> Public run verifier</p>
        <h1>One commitment.<br /><span>No recipient rows.</span></h1>
      </header>
      <nav className="shell secondary-nav"><Link href="/">Home</Link><Link href="/registry">Registry</Link></nav>
      <section className="shell wallet-shell">
        {(!result.ok || !result.config.registryAddress || parsedRunId === null) && (
          <p className="notice warning">This run cannot be read because its identifier or the public registry configuration is unavailable.</p>
        )}
        {result.ok && result.config.registryAddress && parsedRunId !== null && (
          <RunCard rpcUrl={result.config.rpcUrl} registryAddress={result.config.registryAddress} runId={parsedRunId} />
        )}
      </section>
    </main>
  );
}
