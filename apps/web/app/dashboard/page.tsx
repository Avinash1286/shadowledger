import type { Metadata } from "next";
import Link from "next/link";

import { readPublicConfig } from "@/lib/config";

export const metadata: Metadata = { title: "Organization dashboard — ShadowLedger", description: "Launch and verify private payroll runs on Starknet Mainnet." };

export default function DashboardPage() {
  const config = readPublicConfig();
  const registryReady = config.ok && Boolean(config.config.registryAddress);
  return <main>
    <header className="hero compact-hero shell"><div className="eyebrow"><span className="signal" /> Organization workspace · Starknet Mainnet</div><h1>One payroll workflow.<br /><span>Two visibility zones.</span></h1><p className="lede">Private allocations stay in this browser and the STRK20 wallet. Aggregate commitments and finalized transaction references remain publicly auditable.</p><div className="hero-actions"><Link className="primary-link" href="/payroll/new">Create payroll run</Link></div></header>
    <nav className="shell secondary-nav" aria-label="Dashboard navigation"><Link href="/">Overview</Link><Link href="/registry">Registry</Link><Link href="/verify">Receipt verifier</Link><Link href="/auditor">Auditor mode</Link></nav>
    <section className="shell dashboard-section" aria-labelledby="readiness-title">
      <div className="section-heading"><div><p className="section-kicker">Live readiness</p><h2 id="readiness-title">Submission-safe operating state</h2></div><p>No private payroll rows are persisted in this dashboard.</p></div>
      <div className="status-grid">
        <article className="status-card"><p>Network</p><strong className={config.ok ? "good" : "warn"}>{config.ok ? "SN_MAIN locked" : "Configuration blocked"}</strong></article>
        <article className="status-card"><p>Registry</p><strong className={registryReady ? "good" : "warn"}>{registryReady ? "Mainnet configured" : "Mainnet address pending"}</strong></article>
        <article className="status-card"><p>Private batch</p><strong className="good">3–5 recipients</strong></article>
        <article className="status-card"><p>Evidence</p><strong className="warn">Wallet approval required</strong></article>
      </div>
      {!registryReady && <div className="notice warning">The product code is ready, but a real end-to-end mainnet run cannot be claimed until the registry address is deployed and configured.</div>}
    </section>
    <section className="shell workspace-grid dashboard-section">
      <article className="panel"><p className="section-kicker">Admin path</p><h2>Run payroll privately</h2><p className="panel-copy">Import locally, generate the aggregate commitment, simulate the complete STRK20 batch, then approve create → pay → finalize.</p><div className="stacked-actions"><Link className="primary-link" href="/payroll/new">Open payroll builder</Link><Link className="secondary-button link-button" href="/recipient/activate">Check recipient readiness</Link></div></article>
      <article className="panel"><p className="section-kicker">Independent proof</p><h2>Verify without the payroll book</h2><p className="panel-copy">Recipients verify one signed line; auditors reproduce the complete root only from a privately supplied local package.</p><div className="stacked-actions"><Link className="secondary-button link-button" href="/verify">Verify portable receipt</Link><Link className="secondary-button link-button" href="/auditor">Open local auditor</Link></div></article>
    </section>
    <footer className="shell footer"><p>Private rows are tab-scoped. Public registry state remains the source of truth.</p><p>Feature freeze · August 29</p></footer>
  </main>;
}
