"use client";

import { type ChangeEvent, useState } from "react";

import { parseAuditPackage, verifyAuditPackage, type AuditReport } from "@/lib/audit/package";

import styles from "./verification-workspace.module.css";

export function AuditWorkspace() {
  const [source, setSource] = useState("");
  const [filename, setFilename] = useState("No package loaded.");
  const [report, setReport] = useState<AuditReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setSource(await file.text());
    setFilename(file.name);
    setReport(null);
    setError(null);
  }

  function verify() {
    setError(null);
    try {
      setReport(verifyAuditPackage(parseAuditPackage(source)));
    } catch (cause) {
      setReport(null);
      setError(cause instanceof Error ? cause.message : "Audit package verification failed.");
    }
  }

  function clear() {
    setSource("");
    setFilename("No package loaded.");
    setReport(null);
    setError(null);
  }

  return (
    <section className={`shell ${styles.workspace}`}>
      <div className="notice warning"><strong>Sensitive file:</strong> an audit package contains every recipient, amount, and salt. It is processed only in this tab and must not be uploaded to a shared service.</div>
      <article className="panel">
        <h2>Local audit package</h2>
        <p className="panel-copy">Recompute the Poseidon tree, canonical manifest hash, aggregate, count, token, and period without a server.</p>
        <div className="field"><label htmlFor="audit-json">Package JSON</label><textarea id="audit-json" rows={14} value={source} placeholder="{ … }" spellCheck={false} onChange={(event) => { setSource(event.target.value); setReport(null); }} /></div>
        <p className={styles.filename}>{filename}</p>
        <div className="action-row">
          <label className="secondary-button" htmlFor="audit-file">Upload locally</label>
          <input className={styles.hidden} id="audit-file" type="file" accept="application/json,.json" onChange={(event) => void loadFile(event)} />
          <button className="primary-button" type="button" disabled={!source.trim()} onClick={verify}>Recompute audit</button>
          <button className="secondary-button" type="button" onClick={clear}>Clear package from memory</button>
        </div>
        {error && <div className="notice error" role="alert">{error}</div>}
      </article>
      {report && (
        <section className={styles.report} aria-live="polite">
          <h2>Audit report · {report.valid ? "Pass" : "Fail"}</h2>
          {report.recomputed && <dl className={styles.recomputed}><div><dt>Root</dt><dd>{report.recomputed.merkleRoot}</dd></div><div><dt>Total</dt><dd>{report.recomputed.aggregateAmount}</dd></div><div><dt>Count</dt><dd>{report.recomputed.recipientCount}</dd></div></dl>}
          <ul>{report.checks.map((check) => <li key={check.name} className={check.ok ? styles.pass : styles.fail}><strong>{check.ok ? "✓" : "×"} {check.name}</strong><span>{check.detail}</span></li>)}</ul>
        </section>
      )}
    </section>
  );
}
