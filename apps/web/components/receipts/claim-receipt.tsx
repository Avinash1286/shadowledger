"use client";

import { useEffect, useState } from "react";

import { decryptReceipt, readClaimKey } from "@/lib/receipts/crypto";
import { fetchEncryptedReceipt } from "@/lib/receipts/convex-client";
import type { RecipientReceiptV1 } from "@/lib/receipts/types";
import { shortAddress } from "@/lib/strk20/address";

export function ClaimReceipt(props: { blobId: string; convexUrl: string | null }) {
  const [receipt, setReceipt] = useState<RecipientReceiptV1 | null>(null);
  const [message, setMessage] = useState("Waiting for local decryption…");
  const [error, setError] = useState<string | null>(null);

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

  if (error) return <p className="notice error">{error}</p>;
  if (!receipt) return <p className="notice">{message}</p>;
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
