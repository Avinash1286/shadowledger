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
          <p className="section-kicker">Complete through August 21</p>
          <h2 id="milestone-heading">Public commitments. Private receipts.</h2>
        </div>
        <p>
          Register aggregate runs on Starknet, verify their event-backed state, then
          deliver AES-GCM receipts whose keys stay in private claim-link fragments.
        </p>
      </section>

      <nav className="shell secondary-nav" aria-label="Product flows">
        <Link href="/payroll/new">Local payroll builder</Link>
        <Link href="/recipient/activate">Recipient readiness</Link>
        <Link href="/registry">Run registry</Link>
        <Link href="/receipts">Encrypted receipts</Link>
      </nav>

      <WalletPanel />

      <footer className="shell footer">
        <p>Viewing keys stay in your wallet. ShadowLedger never requests them.</p>
        <p>Payments · RFP-11 · MIT</p>
      </footer>
    </main>
  );
}
