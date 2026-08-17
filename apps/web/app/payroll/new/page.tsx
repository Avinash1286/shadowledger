import type { Metadata } from "next";
import Link from "next/link";

import { PayrollInput } from "@/components/payroll/payroll-input";
import { readPublicConfig } from "@/lib/config";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Create payroll — ShadowLedger",
  description: "Build and validate a private payroll locally in your browser.",
};

export default function NewPayrollPage() {
  const configResult = readPublicConfig();

  return (
    <main>
      <header className="hero shell">
        <Link className={styles.backLink} href="/"><span aria-hidden="true">←</span> ShadowLedger</Link>
        <div className="eyebrow"><span className="signal" /> Local payroll builder · August 17</div>
        <h1>Build the payroll here.<br /><span>Keep every row here.</span></h1>
        <p className="lede">Enter allocations manually or import a CSV. Exact decimal conversion, address checks, duplicate detection, and totals all run on this device—before any commitment or transaction exists.</p>
      </header>

      <section className="shell milestone" aria-labelledby="input-milestone">
        <div><p className="section-kicker">Today&apos;s exit gate</p><h2 id="input-milestone">Three rows. Zero uploads.</h2></div>
        <p>The CSV is read with the browser File API and never submitted to a Server Action, route handler, analytics endpoint, or ShadowLedger backend.</p>
      </section>

      {configResult.ok ? (
        <PayrollInput tokenSymbol={configResult.config.tokenSymbol} tokenDecimals={configResult.config.tokenDecimals} />
      ) : (
        <section className="shell"><div className="notice error" role="alert">Configuration blocked: {configResult.message}</div></section>
      )}

      <footer className="shell footer"><p>Addresses, amounts, memos, and CSV rows never leave this page.</p><p>Starknet Mainnet · Local validation</p></footer>
    </main>
  );
}
