import type { Metadata } from "next";
import Link from "next/link";

import { AuditWorkspace } from "@/components/verification/audit-workspace";

export const metadata: Metadata = { title: "Auditor mode — ShadowLedger", description: "Reproduce a ShadowLedger payroll commitment locally.", robots: { index: false, follow: false, nocache: true } };

export default function AuditorPage() {
  return <main>
    <header className="hero compact-hero shell"><div className="eyebrow"><span className="signal" /> August 25 · local auditor mode</div><h1>Reproduce the run.<br /><span>Keep the book offline.</span></h1><p className="lede">Load the private package from the payer and independently reproduce its public root, manifest hash, aggregate, and recipient count entirely in this browser tab.</p><div className="hero-actions"><Link className="secondary-nav" href="/">← ShadowLedger</Link></div></header>
    <AuditWorkspace />
  </main>;
}
