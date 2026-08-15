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
          <Link className="primary-link" href="/recipient/activate">
            Check recipient readiness
          </Link>
        </div>
      </header>

      <section className="shell milestone" aria-labelledby="milestone-heading">
        <div>
          <p className="section-kicker">August 16 recipient readiness</p>
          <h2 id="milestone-heading">Activate, verify, then transfer.</h2>
        </div>
        <p>
          Prepare three demo recipients, require <code>SN_MAIN</code> and Wallet API
          support, then simulate one tiny private transfer with no public fallback.
        </p>
      </section>

      <WalletPanel />

      <footer className="shell footer">
        <p>Viewing keys stay in your wallet. ShadowLedger never requests them.</p>
        <p>Payments · RFP-11 · MIT</p>
      </footer>
    </main>
  );
}
