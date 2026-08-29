import Link from "next/link";

import { WalletPanel } from "@/components/wallet/wallet-panel";

export default function Home() {
  return (
    <main>
      <header className="hero shell">
        <div className="eyebrow"><span className="signal" /> Starknet mainnet · STRK20</div>
        <h1>Payroll details stay private.<br /><span>Accountability does not.</span></h1>
        <p className="lede">Distribute a three-to-five-person payroll through STRK20 without publishing individual recipients or allocations, while committing the aggregate on Starknet.</p>
        <div className="hero-actions">
          <Link className="primary-link" href="/dashboard">Open live product</Link>
        </div>
      </header>

      <section className="shell milestone" aria-labelledby="milestone-heading">
        <div>
          <p className="section-kicker">Submission build · feature frozen</p>
          <h2 id="milestone-heading">Private payments. Public accountability.</h2>
        </div>
        <p>
          Register aggregate runs on Starknet, verify their event-backed state, then
          deliver AES-GCM receipts whose keys stay in private claim-link fragments.
        </p>
      </section>

      <nav className="shell secondary-nav" aria-label="Product flows">
        <Link href="/dashboard">Organization dashboard</Link>
        <Link href="/payroll/new">Local payroll builder</Link>
        <Link href="/recipient/activate">Recipient readiness</Link>
        <Link href="/registry">Run registry</Link>
        <Link href="/receipts">Encrypted receipts</Link>
        <Link href="/verify">Verify receipt</Link>
        <Link href="/auditor">Auditor mode</Link>
        <Link href="/privacy">Privacy model</Link>
      </nav>

      <section className="shell comparison-section" aria-labelledby="comparison-heading">
        <div className="section-heading"><div><p className="section-kicker">The difference</p><h2 id="comparison-heading">Accountability without a salary leaderboard.</h2></div><p>Judges and public observers see a compact aggregate record. Each recipient sees only their voluntarily disclosed line.</p></div>
        <div className="comparison-grid"><article className="comparison-card public-card"><span>PUBLIC</span><h3>August payroll</h3><dl><div><dt>Token</dt><dd>STRK</dd></div><div><dt>Total</dt><dd>Committed</dd></div><div><dt>Recipients</dt><dd>3</dd></div><div><dt>Merkle root</dt><dd>0x…</dd></div><div><dt>Individual rows</dt><dd>Hidden</dd></div></dl></article><article className="comparison-card private-card"><span>RECIPIENT</span><h3>My receipt</h3><dl><div><dt>My amount</dt><dd>Disclosed to me</dd></div><div><dt>Inclusion</dt><dd>✓ Valid</dd></div><div><dt>Payer signature</dt><dd>✓ Valid</dd></div><div><dt>Other recipients</dt><dd>Hidden</dd></div><div><dt>Other amounts</dt><dd>Hidden</dd></div></dl></article></div>
      </section>

      <section className="shell flow-section" aria-labelledby="flow-heading"><div className="section-heading"><div><p className="section-kicker">End to end</p><h2 id="flow-heading">Commit → batch → attest → verify</h2></div></div><ol className="flow-grid"><li><span>01</span><strong>Build locally</strong><p>CSV rows, salts, and proofs stay in the browser.</p></li><li><span>02</span><strong>Pay privately</strong><p>One simulated STRK20 action batch for 3–5 recipients.</p></li><li><span>03</span><strong>Finalize publicly</strong><p>The registry binds aggregate commitments to accepted pool evidence.</p></li><li><span>04</span><strong>Disclose selectively</strong><p>Signed receipts and audit packages verify only what is shared.</p></li></ol></section>

      <WalletPanel />

      <footer className="shell footer">
        <p>Viewing keys stay in your wallet. ShadowLedger never requests them.</p>
        <p><a href="https://github.com/Avinash1286/shadowledger">GitHub</a> · Payments · RFP-11 · MIT</p>
      </footer>
    </main>
  );
}
