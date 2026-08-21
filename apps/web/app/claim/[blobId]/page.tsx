import Link from "next/link";

import { ClaimReceipt } from "@/components/receipts/claim-receipt";

export default async function ClaimPage({ params }: { params: Promise<{ blobId: string }> }) {
  const { blobId } = await params;
  return (
    <main>
      <header className="hero shell compact-hero">
        <p className="eyebrow"><span className="signal" /> Private recipient claim</p>
        <h1>The server sees a blob.<br /><span>Your browser sees the receipt.</span></h1>
      </header>
      <nav className="shell secondary-nav"><Link href="/">Home</Link></nav>
      <section className="shell wallet-shell"><ClaimReceipt blobId={blobId} convexUrl={process.env.NEXT_PUBLIC_CONVEX_URL ?? null} /></section>
    </main>
  );
}
