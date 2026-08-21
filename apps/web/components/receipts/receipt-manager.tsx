"use client";

import { useState } from "react";

import {
  buildClaimLink,
  createRecoveryBundle,
  encryptReceipt,
  parseReceipt,
} from "@/lib/receipts/crypto";
import { storeEncryptedReceipt } from "@/lib/receipts/convex-client";
import type { ClaimSecret, RecoveryBundleSecret } from "@/lib/receipts/types";

const SAMPLE_RECEIPT = JSON.stringify({
  schema: "shadowledger/recipient-receipt/v1",
  runId: "0x20260821",
  recipient: "0x1234",
  token: "0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
  amount: "1000000000000000",
  period: "2026-08",
  memo: "August payroll",
  merkleProof: { leaf: "0x101", siblings: ["0x202"], directions: ["right"] },
}, null, 2);

function downloadJson(filename: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ReceiptManager(props: { convexUrl: string | null; allowDevelopmentStore?: boolean }) {
  const [source, setSource] = useState(SAMPLE_RECEIPT);
  const [claim, setClaim] = useState<ClaimSecret | null>(null);
  const [claimLink, setClaimLink] = useState<string | null>(null);
  const [recovery, setRecovery] = useState<RecoveryBundleSecret | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const parsed: unknown = JSON.parse(source);
      const nextClaim = await encryptReceipt(parseReceipt(parsed));
      const link = buildClaimLink(window.location.origin, nextClaim.blob.blobId, nextClaim.key);
      const nextRecovery = await createRecoveryBundle([link]);
      setClaim(nextClaim);
      setClaimLink(link);
      setRecovery(nextRecovery);
      if (!props.convexUrl) {
        setMessage("Encrypted locally. Configure NEXT_PUBLIC_CONVEX_URL to publish only the ciphertext for claiming.");
        return;
      }
      try {
        await storeEncryptedReceipt(props.convexUrl, nextClaim.blob);
        setMessage("Ciphertext stored. The decryption key exists only in the claim-link fragment and recovery bundle.");
      } catch {
        if (props.allowDevelopmentStore) {
          const response = await fetch("/api/development/encrypted-blob", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(nextClaim.blob),
          });
          if (!response.ok) throw new Error("Local Convex fixture storage failed.");
          setMessage("Ciphertext stored in local Convex. The decryption key exists only in the claim-link fragment and recovery bundle.");
        } else {
          setMessage("Encrypted locally, but authenticated Convex storage was unavailable. Nothing plaintext left this browser.");
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Receipt encryption failed.");
    } finally {
      setBusy(false);
    }
  }

  async function copyClaim() {
    if (!claimLink) return;
    await navigator.clipboard.writeText(claimLink);
    setMessage("Claim link copied. Send it through an end-to-end encrypted channel.");
  }

  return (
    <div className="workspace-grid">
      <section className="panel">
        <p className="section-kicker">Admin encryption</p>
        <h2>Seal one recipient receipt</h2>
        <p className="panel-copy">AES-256-GCM encryption happens locally. Convex receives the IV and ciphertext, never the key or row JSON.</p>
        <div className="field">
          <label htmlFor="receipt-json">Recipient receipt JSON</label>
          <textarea id="receipt-json" rows={18} value={source} onChange={(event) => setSource(event.target.value)} spellCheck={false} />
        </div>
        <button className="primary-button" disabled={busy} type="button" onClick={() => void generate()}>{busy ? "Encrypting…" : "Encrypt and prepare claim"}</button>
        {message && <p className="notice success">{message}</p>}
        {error && <p className="notice error">{error}</p>}
      </section>
      <section className="panel">
        <p className="section-kicker">Claim material</p>
        <h2>Separate ciphertext from keys</h2>
        {!claim && <p className="notice">Generate a receipt to create a random 256-bit claim key and encrypted recovery bundle.</p>}
        {claim && claimLink && recovery && (
          <>
            <ul className="detail-list">
              <li><span>Blob ID</span><strong>{claim.blob.blobId}</strong></li>
              <li><span>Algorithm</span><strong>{claim.blob.algorithm}</strong></li>
              <li><span>Claim key location</span><strong>URL fragment only</strong></li>
            </ul>
            <div className="stacked-actions">
              <a className="primary-link" href={claimLink}>Open recipient claim in this browser</a>
              <button className="primary-button" type="button" onClick={() => void copyClaim()}>Copy private claim link</button>
              <button className="secondary-button" type="button" onClick={() => downloadJson(`${claim.blob.blobId}.ciphertext.json`, claim.blob)}>Download ciphertext</button>
              <button className="secondary-button" type="button" onClick={() => downloadJson(`${recovery.bundle.bundleId}.recovery.json`, recovery.bundle)}>Download encrypted recovery bundle</button>
              <button className="secondary-button" type="button" onClick={() => downloadJson(`${recovery.bundle.bundleId}.recovery-key.private.json`, { key: recovery.key })}>Download recovery key separately</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
