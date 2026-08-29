import Link from "next/link";
import type { Metadata } from "next";

import { ClaimReceipt } from "@/components/receipts/claim-receipt";
import { WalletPanel } from "@/components/wallet/wallet-panel";
import { readPublicConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Private receipt claim — ShadowLedger",
  description: "Decrypt and verify a private payroll receipt locally.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function ClaimPage({ params }: { params: Promise<{ blobId: string }> }) {
  const { blobId } = await params;
  const config = readPublicConfig();
  return (
    <main>
      <header className="hero shell compact-hero">
        <p className="eyebrow"><span className="signal" /> Private recipient claim</p>
        <h1>The server sees a blob.<br /><span>Your browser sees the receipt.</span></h1>
      </header>
      <nav className="shell secondary-nav"><Link href="/">Home</Link></nav>
      <section className="shell wallet-shell"><ClaimReceipt blobId={blobId} convexUrl={process.env.NEXT_PUBLIC_CONVEX_URL ?? null} rpcUrl={config.ok ? config.config.rpcUrl : null} /></section>
      <WalletPanel compact />
    </main>
  );
}
