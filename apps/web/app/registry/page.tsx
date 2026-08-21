import Link from "next/link";

import { RegistryPanel } from "@/components/registry/registry-panel";
import { DevelopmentRegistryCheck } from "@/components/registry/development-registry-check";
import { WalletPanel } from "@/components/wallet/wallet-panel";
import { readPublicConfig } from "@/lib/config";

export default function RegistryPage() {
  const result = readPublicConfig();
  return (
    <main>
      <header className="hero shell compact-hero">
        <p className="eyebrow"><span className="signal" /> August 20 · onchain registry</p>
        <h1>Publish the aggregate.<br /><span>Keep the payroll private.</span></h1>
        <p className="lede">Create, finalize, and cancel payroll commitments with receipt-event and state verification.</p>
      </header>
      <nav className="shell secondary-nav"><Link href="/">Home</Link><Link href="/receipts">Encrypted receipts</Link></nav>
      <section className="shell wallet-shell">
        {process.env.NODE_ENV === "development" && <DevelopmentRegistryCheck />}
        {!result.ok && <p className="notice error">{result.message}</p>}
        {result.ok && !result.config.registryAddress && <p className="notice warning">Set NEXT_PUBLIC_PAYROLL_REGISTRY_ADDRESS after deploying the registry.</p>}
        {result.ok && result.config.registryAddress && (
          <RegistryPanel registryAddress={result.config.registryAddress} tokenAddress={result.config.tokenAddress} />
        )}
      </section>
      <WalletPanel />
    </main>
  );
}
