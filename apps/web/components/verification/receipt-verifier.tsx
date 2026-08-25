"use client";

import { type ChangeEvent, useState } from "react";
import { RpcProvider } from "starknet";

import { readRegistryRun } from "@/lib/registry/client";
import {
  compareReceiptToRegistry,
  parsePortableReceipt,
  verifyPortableReceiptLocally,
  verifyReceiptSignature,
  type ReceiptVerificationReport,
} from "@/lib/receipts/portable";

import styles from "./verification-workspace.module.css";

export function ReceiptVerifier({ rpcUrl }: { rpcUrl: string }) {
  const [source, setSource] = useState("");
  const [localReport, setLocalReport] = useState<ReceiptVerificationReport | null>(null);
  const [onlineReport, setOnlineReport] = useState<ReceiptVerificationReport | null>(null);
  const [signatureValid, setSignatureValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  function verifyLocal() {
    setError(null);
    setOnlineReport(null);
    setSignatureValid(null);
    try {
      setLocalReport(verifyPortableReceiptLocally(parsePortableReceipt(source)));
    } catch (cause) {
      setLocalReport(null);
      setError(cause instanceof Error ? cause.message : "Receipt verification failed.");
    }
  }

  async function verifyOnline() {
    setError(null);
    setChecking(true);
    try {
      const receipt = parsePortableReceipt(source);
      const provider = new RpcProvider({ nodeUrl: rpcUrl });
      const [signature, run] = await Promise.all([
        verifyReceiptSignature(provider, receipt),
        readRegistryRun({ provider, registryAddress: receipt.registryAddress, runId: BigInt(receipt.manifest.runId) }),
      ]);
      setSignatureValid(signature);
      setOnlineReport(compareReceiptToRegistry(receipt, run));
    } catch (cause) {
      setOnlineReport(null);
      setSignatureValid(false);
      setError(cause instanceof Error ? cause.message : "Online verification failed.");
    } finally {
      setChecking(false);
    }
  }

  async function loadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) setSource(await file.text());
  }

  function clear() {
    setSource("");
    setLocalReport(null);
    setOnlineReport(null);
    setSignatureValid(null);
    setError(null);
  }

  const renderReport = (title: string, report: ReceiptVerificationReport) => (
    <section className={styles.report} aria-label={title}>
      <h2>{title} · {report.valid ? "Pass" : "Fail"}</h2>
      <ul>{report.checks.map((check) => <li key={check.name} className={check.ok ? styles.pass : styles.fail}><strong>{check.ok ? "✓" : "×"} {check.name}</strong><span>{check.detail}</span></li>)}</ul>
    </section>
  );

  return (
    <section className={`shell ${styles.workspace}`}>
      <article className="panel">
        <h2>Portable receipt JSON</h2>
        <p className="panel-copy">Upload or paste a receipt. Local checks make no network request; online checks query Starknet for the payer signature and finalized registry values.</p>
        <div className="field"><label htmlFor="receipt-json">Receipt</label><textarea id="receipt-json" rows={16} value={source} placeholder="{ … }" spellCheck={false} onChange={(event) => setSource(event.target.value)} /></div>
        <div className="action-row">
          <label className="secondary-button" htmlFor="receipt-file">Upload JSON</label>
          <input className={styles.hidden} id="receipt-file" type="file" accept="application/json,.json" onChange={(event) => void loadFile(event)} />
          <button className="primary-button" type="button" disabled={!source.trim()} onClick={verifyLocal}>Verify locally</button>
          <button className="secondary-button" type="button" disabled={!localReport?.valid || checking} onClick={() => void verifyOnline()}>{checking ? "Checking mainnet…" : "Compare on mainnet"}</button>
          <button className="secondary-button" type="button" onClick={clear}>Clear memory</button>
        </div>
        {error && <div className="notice error" role="alert">{error}</div>}
      </article>
      {localReport && renderReport("Local receipt proof", localReport)}
      {signatureValid !== null && <div className={signatureValid ? "notice success" : "notice error"}>Payer account signature: {signatureValid ? "valid" : "invalid"}</div>}
      {onlineReport && renderReport("Finalized registry comparison", onlineReport)}
    </section>
  );
}
