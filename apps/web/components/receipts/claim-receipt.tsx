"use client";

import { useEffect, useState } from "react";

import { decryptReceipt, readClaimKey } from "@/lib/receipts/crypto";
import { fetchEncryptedReceipt } from "@/lib/receipts/convex-client";
import type { ReceiptPlaintextV1 } from "@/lib/receipts/types";
import { shortAddress } from "@/lib/strk20/address";
import { useWalletStore } from "@/lib/stores/wallet-store";
import { addressesEqual } from "@/lib/strk20/address";
import { compareReceiptToRegistry, verifyPortableReceiptLocally, verifyReceiptSignature, type ReceiptVerificationReport } from "@/lib/receipts/portable";
import { readRegistryRun } from "@/lib/registry/client";
import { RpcProvider } from "starknet";

export function ClaimReceipt(props: { blobId: string; convexUrl: string | null; rpcUrl: string | null }) {
  const session = useWalletStore((state) => state.session);
  const [receipt, setReceipt] = useState<ReceiptPlaintextV1 | null>(null);
  const [message, setMessage] = useState("Waiting for local decryption…");
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState<ReceiptVerificationReport | null>(null);
  const [signatureValid, setSignatureValid] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let active = true;
    async function claim() {
      if (!props.convexUrl) throw new Error("Encrypted receipt storage is not configured.");
      const key = readClaimKey(window.location.hash);
      const blob = await fetchEncryptedReceipt(props.convexUrl, props.blobId);
      if (!blob) throw new Error("This encrypted receipt was not found, expired, or was revoked.");
      const opened = await decryptReceipt(blob, key);
      if (active) {
        setReceipt(opened);
        setMessage("Decrypted in this browser. The fragment key was never sent to the server.");
      }
    }
    claim().catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "The receipt could not be claimed.");
    });
    return () => { active = false; };
  }, [props.blobId, props.convexUrl]);

  async function verifyOnline() {
    if (!receipt || receipt.schema !== "shadowledger/portable-receipt/v1" || !props.rpcUrl) return;
    setChecking(true);
    setError(null);
    try {
      const provider = new RpcProvider({ nodeUrl: props.rpcUrl });
      const [validSignature, run] = await Promise.all([
        verifyReceiptSignature(provider, receipt),
        readRegistryRun({ provider, registryAddress: receipt.registryAddress, runId: BigInt(receipt.manifest.runId) }),
      ]);
      setSignatureValid(validSignature);
      setOnline(compareReceiptToRegistry(receipt, run));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Mainnet receipt verification failed.");
    } finally {
      setChecking(false);
    }
  }

  if (error) return <p className="notice error">{error}</p>;
  if (!receipt) return <p className="notice">{message}</p>;
  if (receipt.schema === "shadowledger/portable-receipt/v1") {
    const local = verifyPortableReceiptLocally(receipt);
    const walletMatches = session ? addressesEqual(session.address, receipt.payment.recipient) : null;
    return (
      <article className="panel">
        <p className="section-kicker">Recipient-only portable receipt</p>
        <h2>{receipt.payment.period} payment</h2>
        <p className="notice success">{message}</p>
        <ul className="verification-list">
          {local.checks.map((check) => <li key={check.name} className={check.ok ? "verification-pass" : "verification-fail"}><strong>{check.ok ? "✓" : "×"} {check.name}</strong><span>{check.detail}</span></li>)}
          <li className={walletMatches === true ? "verification-pass" : walletMatches === false ? "verification-fail" : ""}><strong>{walletMatches === true ? "✓" : walletMatches === false ? "×" : "○"} Connected recipient</strong><span>{walletMatches === null ? "Connect the recipient wallet below to compare the account locally." : walletMatches ? "Connected account matches the disclosed recipient." : "Connected account does not match this receipt."}</span></li>
          {signatureValid !== null && <li className={signatureValid ? "verification-pass" : "verification-fail"}><strong>{signatureValid ? "✓" : "×"} Payer signature</strong><span>Verified through the Starknet account contract.</span></li>}
          {online?.checks.map((check) => <li key={check.name} className={check.ok ? "verification-pass" : "verification-fail"}><strong>{check.ok ? "✓" : "×"} {check.name}</strong><span>{check.detail}</span></li>)}
        </ul>
        <ul className="detail-list"><li><span>My amount (base units)</span><strong>{receipt.payment.amount}</strong></li><li><span>Run</span><strong>{receipt.manifest.runId}</strong></li><li><span>Other payroll rows</span><strong>Not disclosed</strong></li></ul>
        <div className="stacked-actions"><button className="primary-button" type="button" disabled={!local.valid || !props.rpcUrl || checking} onClick={() => void verifyOnline()}>{checking ? "Checking mainnet…" : "Verify signature and registry"}</button></div>
      </article>
    );
  }
  return (
    <article className="panel">
      <p className="section-kicker">Recipient-only plaintext</p>
      <h2>Payroll receipt</h2>
      <p className="notice success">{message}</p>
      <ul className="detail-list">
        <li><span>Run</span><strong>{receipt.runId}</strong></li>
        <li><span>Recipient</span><strong title={receipt.recipient}>{shortAddress(receipt.recipient)}</strong></li>
        <li><span>Token</span><strong title={receipt.token}>{shortAddress(receipt.token)}</strong></li>
        <li><span>Amount (base units)</span><strong>{receipt.amount}</strong></li>
        <li><span>Period</span><strong>{receipt.period}</strong></li>
        {receipt.memo && <li><span>Memo</span><strong>{receipt.memo}</strong></li>}
        <li><span>Proof siblings</span><strong>{receipt.merkleProof.siblings.length}</strong></li>
      </ul>
    </article>
  );
}
