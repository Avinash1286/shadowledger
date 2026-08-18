import Link from "next/link";

import { WalletPanel } from "@/components/wallet/wallet-panel";

export default function Home() {
  return (
    <main>
      <header className="hero shell">
        <div className="eyebrow"><span className="signal" /> Starknet mainnet · STRK20</div>
        <h1>Payroll details stay private.<br /><span>Accountability does not.</span></h1>
        <p className="lede">
          ShadowLedger is building private payroll distribution with public aggregate
          commitments and selective verification for recipients and auditors.
        </p>
        <div className="hero-actions">
          <Link className="primary-link" href="/payroll/new">
            Create a local payroll
          </Link>
        </div>
      </header>

      <section className="shell milestone" aria-labelledby="milestone-heading">
        <div>
          <p className="section-kicker">August 18 Poseidon commitments</p>
          <h2 id="milestone-heading">Three proofs. One public root.</h2>
        </div>
        <p>
          Generate salted leaves, positional Merkle proofs, and a canonical public
          manifest while every recipient row remains local to the browser.
        </p>
      </section>

      <nav className="shell secondary-nav" aria-label="Product flows">
        <Link href="/payroll/new">Local payroll builder</Link>
        <Link href="/recipient/activate">Recipient readiness</Link>
      </nav>

      <WalletPanel />

      <footer className="shell footer">
        <p>Viewing keys stay in your wallet. ShadowLedger never requests them.</p>
        <p>Payments · RFP-11 · MIT</p>
      </footer>
    </main>
  );
}
