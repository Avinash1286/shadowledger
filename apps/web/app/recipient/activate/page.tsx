import type { Metadata } from "next";
import Link from "next/link";

import { RecipientActivation } from "@/components/recipient/recipient-activation";

import styles from "./recipient-activation.module.css";

export const metadata: Metadata = {
  title: "Recipient activation — ShadowLedger",
  description:
    "Check whether a Starknet mainnet wallet is ready to receive private STRK20 payroll.",
};

export default function RecipientActivationPage() {
  return (
    <main>
      <header className="hero shell">
        <Link className={styles.backLink} href="/">
          <span aria-hidden="true">←</span> ShadowLedger
        </Link>
        <div className="eyebrow">
          <span className="signal" /> Recipient onboarding · August 16
        </div>
        <h1>
          Make one account ready.
          <br />
          <span>Keep every payment private.</span>
        </h1>
        <p className="lede">
          A recipient registers once with the STRK20 pool so private notes can be
          encrypted for their wallet. ShadowLedger checks readiness without
          requesting a viewing key or storing recipient data.
        </p>
      </header>

      <section className="shell milestone" aria-labelledby="activation-heading">
        <div>
          <p className="section-kicker">Recipient precondition</p>
          <h2 id="activation-heading">Connect, verify, then receive.</h2>
        </div>
        <p>
          Registration publishes a public viewing key on Starknet once. The private
          half remains wallet-controlled. ShadowLedger verifies Wallet API access,
          while each recipient completes activation inside Ready X.
        </p>
      </section>

      <RecipientActivation />

      <footer className="shell footer">
        <p>No recipient address, balance, or viewing key is sent to a ShadowLedger backend.</p>
        <p>Starknet Mainnet · Wallet API 0.10.3+</p>
      </footer>
    </main>
  );
}
