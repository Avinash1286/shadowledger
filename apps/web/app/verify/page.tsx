import type { Metadata } from "next";
import Link from "next/link";

import { ReceiptVerifier } from "@/components/verification/receipt-verifier";
import { readPublicConfig } from "@/lib/config";

export const metadata: Metadata = { title: "Verify receipt — ShadowLedger", description: "Independently verify a portable private payroll receipt." };

export default function VerifyPage() {
  const config = readPublicConfig();
  return <main>
    <header className="hero compact-hero shell"><div className="eyebrow"><span className="signal" /> August 24 · independent verification</div><h1>Verify one line.<br /><span>Reveal nothing else.</span></h1><p className="lede">Recompute the disclosed payroll leaf and Merkle path locally, then optionally compare the payer signature and finalized run against Starknet Mainnet.</p><div className="hero-actions"><Link className="secondary-nav" href="/">← ShadowLedger</Link></div></header>
    {config.ok ? <ReceiptVerifier rpcUrl={config.config.rpcUrl} /> : <section className="shell"><div className="notice error">Configuration blocked: {config.message}</div></section>}
  </main>;
}
