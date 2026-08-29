import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy model — ShadowLedger", description: "What ShadowLedger hides, publishes, and can selectively disclose." };

const rows = [
  ["Shield/deposit", "Address, token, amount, timing", "Future in-pool note ownership"],
  ["Private payroll batch", "A STRK20 pool interaction occurred", "Sender-to-recipient links, recipients, individual allocations"],
  ["Payroll registry", "Token, aggregate, count, hashes, timestamps", "Addresses and amounts for individual rows"],
  ["Recipient receipt", "Nothing unless voluntarily shared", "Exactly one disclosed row and proof; all other rows"],
  ["Auditor package", "Nothing—the file stays local", "Nothing from the chosen auditor; the complete book is disclosed to them"],
] as const;

export default function PrivacyPage() {
  return <main>
    <header className="hero compact-hero shell"><div className="eyebrow"><span className="signal" /> Honest privacy model</div><h1>Private does not mean invisible.<br /><span>It means deliberately disclosed.</span></h1><p className="lede">ShadowLedger separates publicly auditable aggregate facts from confidential payroll rows. Timing and voluntary disclosure still matter.</p></header>
    <nav className="shell secondary-nav"><Link href="/">Overview</Link><Link href="/dashboard">Dashboard</Link><Link href="/verify">Verifier</Link></nav>
    <section className="shell privacy-section"><div className="table-wrap"><table className="visibility-table"><thead><tr><th>Stage</th><th>Public</th><th>Hidden or selectively disclosed</th></tr></thead><tbody>{rows.map(([stage, visible, hidden]) => <tr key={stage}><th scope="row">{stage}</th><td>{visible}</td><td>{hidden}</td></tr>)}</tbody></table></div></section>
    <section className="shell workspace-grid privacy-section"><article className="panel"><p className="section-kicker">What the receipt proves</p><h2>Commitment inclusion + payer attestation</h2><p className="panel-copy">A portable receipt proves that the disclosed line resolves to the public Merkle root and that the payer signed a binding to the finalized STRK20 transaction reference.</p></article><article className="panel"><p className="section-kicker">What it does not prove</p><h2>No public note inspection</h2><p className="panel-copy">The MVP does not expose a viewing key or cryptographically reveal the private note amount to a public verifier. The signed receipt is selective disclosure, not note decryption.</p></article></section>
    <section className="shell milestone privacy-section"><div><p className="section-kicker">Residual risk</p><h2>Timing can still correlate activity.</h2></div><p>Shield early, avoid funding and paying in one obvious sequence, use only registered recipients, and never paste claim keys or private audit packages into public tools.</p></section>
    <footer className="shell footer"><p>Privacy claims are intentionally bounded by the live STRK20 and receipt interfaces.</p><p><Link href="https://github.com/Avinash1286/shadowledger/blob/main/docs/PRIVACY_MODEL.md">Full specification</Link></p></footer>
  </main>;
}
