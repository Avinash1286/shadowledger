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
      </header>

      <section className="shell milestone" aria-labelledby="milestone-heading">
        <div>
          <p className="section-kicker">August 15 foundation</p>
          <h2 id="milestone-heading">Verify the privacy rail first.</h2>
        </div>
        <p>
          Connect a compatible wallet, prove it is on <code>SN_MAIN</code>, check
          Wallet API support, and read the shielded balance directly from the wallet.
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
