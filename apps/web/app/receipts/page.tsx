import Link from "next/link";

import { ReceiptManager } from "@/components/receipts/receipt-manager";

export default function ReceiptsPage() {
  return (
    <main>
      <header className="hero shell compact-hero">
        <p className="eyebrow"><span className="signal" /> August 21 · encrypted receipts</p>
        <h1>Ciphertext in storage.<br /><span>Keys in private hands.</span></h1>
        <p className="lede">Prepare fragment-key claim links and a separately encrypted admin recovery bundle.</p>
      </header>
      <nav className="shell secondary-nav"><Link href="/">Home</Link><Link href="/registry">Registry</Link></nav>
      <section className="shell wallet-shell"><ReceiptManager convexUrl={process.env.NEXT_PUBLIC_CONVEX_URL ?? null} allowDevelopmentStore={process.env.NODE_ENV === "development"} /></section>
    </main>
  );
}
