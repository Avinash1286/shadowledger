"use client";

import { useMemo, useState } from "react";
import { num } from "starknet";

import {
  buildPayrollCommitment,
  CommitmentError,
} from "@/lib/payroll/commitment";
import type { PayrollCommitment } from "@/lib/payroll/commitment-types";
import type { ValidatedPayrollRow } from "@/lib/payroll/types";
import { verifyMerkleProof } from "@/lib/payroll/merkle";

import styles from "./commitment-panel.module.css";

function parseNonce(value: string): bigint {
  if (!/^\d+$/.test(value.trim())) throw new CommitmentError("Run nonce must be a whole number.");
  const nonce = BigInt(value.trim());
  if (nonce >= (1n << 251n)) throw new CommitmentError("Run nonce is outside the supported felt range.");
  return nonce;
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function CommitmentPanel({
  rows,
  canGenerate,
  token,
  tokenSymbol,
  tokenDecimals,
}: {
  rows: readonly ValidatedPayrollRow[];
  canGenerate: boolean;
  token: `0x${string}`;
  tokenSymbol: string;
  tokenDecimals: number;
}) {
  const [organization, setOrganization] = useState("");
  const [period, setPeriod] = useState("2026-08");
  const [runNonce, setRunNonce] = useState("1");
  const [commitment, setCommitment] = useState<PayrollCommitment | null>(null);
  const [committedFingerprint, setCommittedFingerprint] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fingerprint = useMemo(() => JSON.stringify({
    organization: organization.trim(),
    period: period.trim(),
    runNonce: runNonce.trim(),
    rows: rows.map((row) => [row.normalizedRecipient, row.amountUnits.toString(), row.memo]),
  }), [organization, period, rows, runNonce]);
  const stale = commitment !== null && fingerprint !== committedFingerprint;
  const verifiedProofs = useMemo(() => commitment?.leaves.filter(
    (leaf, index) => verifyMerkleProof(
      leaf,
      commitment.proofs[index]!,
      commitment.merkleRoot,
    ),
  ).length ?? 0, [commitment]);

  function generateCommitment() {
    setError(null);
    try {
      if (!canGenerate) throw new CommitmentError("Resolve every payroll validation issue first.");
      const next = buildPayrollCommitment({
        rows,
        organization,
        organizationRunNonce: parseNonce(runNonce),
        token,
        tokenDecimals,
        period,
        createdAt: new Date().toISOString(),
      });
      setCommitment(next);
      setCommittedFingerprint(fingerprint);
    } catch (cause) {
      setCommitment(null);
      setCommittedFingerprint("");
      setError(cause instanceof CommitmentError ? cause.message : "Commitment generation failed locally.");
    }
  }

  return (
    <section className={styles.commitmentPanel} aria-labelledby="commitment-heading">
      <div className={styles.headingRow}>
        <div>
          <p className="section-kicker">Local Poseidon commitment</p>
          <h2 id="commitment-heading">Commit the total, not the payroll book.</h2>
        </div>
        <span className={styles.algorithm}>Poseidon · v1</span>
      </div>
      <p className={styles.copy}>
        Generate one salted leaf per validated row, positional inclusion proofs, and a
        canonical public manifest. No network or wallet request occurs here.
      </p>

      <div className={styles.formGrid}>
        <div className="field">
          <label htmlFor="commitment-organization">Organization account</label>
          <input id="commitment-organization" value={organization} placeholder="0x…" autoComplete="off" spellCheck={false} onChange={(event) => setOrganization(event.target.value)} />
          <small>The mainnet account that will create the registry run.</small>
        </div>
        <div className="field">
          <label htmlFor="commitment-period">Payroll period</label>
          <input id="commitment-period" value={period} maxLength={80} autoComplete="off" onChange={(event) => setPeriod(event.target.value)} />
          <small>Trimmed and NFC-normalized before Starknet Keccak.</small>
        </div>
        <div className="field">
          <label htmlFor="commitment-nonce">Organization run nonce</label>
          <input id="commitment-nonce" value={runNonce} inputMode="numeric" autoComplete="off" onChange={(event) => setRunNonce(event.target.value)} />
          <small>Increment for every payroll run in this organization.</small>
        </div>
      </div>

      {error && <div className="notice error" role="alert">{error}</div>}
      {stale && <div className="notice warning" role="status">Payroll or run inputs changed. Generate a fresh commitment before using these values.</div>}

      <button className="primary-button" type="button" disabled={!canGenerate} onClick={generateCommitment}>
        {commitment && !stale ? "Regenerate with fresh salts" : "Generate commitment locally"}
      </button>

      {commitment && !stale && (
        <div className={styles.result} aria-live="polite">
          <div className={styles.resultBanner}>
            <span aria-hidden="true">✓</span>
            <div><strong>{verifiedProofs}/{commitment.entries.length} proofs verified</strong><p>Every demo row resolves to this one root.</p></div>
          </div>
          <dl>
            <div><dt>Run ID</dt><dd>{num.toHex(commitment.runId)}</dd></div>
            <div><dt>Merkle root</dt><dd>{num.toHex(commitment.merkleRoot)}</dd></div>
            <div><dt>Manifest hash</dt><dd>{num.toHex(commitment.manifestHash)}</dd></div>
            <div><dt>Public aggregate</dt><dd>{commitment.manifest.aggregateAmount} base units · {tokenSymbol}</dd></div>
            <div><dt>Recipient count</dt><dd>{commitment.manifest.recipientCount}</dd></div>
          </dl>
          <div className={styles.resultActions}>
            <button className="secondary-button" type="button" onClick={() => downloadText("shadowledger-payroll-manifest.json", `${commitment.canonicalManifest}\n`)}>Download public manifest</button>
          </div>
          <p className={styles.privateNote}>Private rows, random 248-bit salts, leaves, and proofs remain in this tab. The downloaded manifest contains none of them.</p>
        </div>
      )}
    </section>
  );
}
