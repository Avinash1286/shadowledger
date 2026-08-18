"use client";

import { type ChangeEvent, useMemo, useRef, useState } from "react";

import { parsePayrollCsv } from "@/lib/payroll/csv";
import type { PayrollDraftRow, PayrollValidationError } from "@/lib/payroll/types";
import { validatePayrollRows } from "@/lib/payroll/validation";
import { formatTokenAmount } from "@/lib/strk20/amount";
import { CommitmentPanel } from "@/components/payroll/commitment-panel";

import styles from "./payroll-input.module.css";

const INITIAL_ROW_COUNT = 3;

function blankRow(index: number): PayrollDraftRow {
  return { id: `manual-row-${index}`, recipient: "", amount: "", memo: "" };
}

function initialRows(): PayrollDraftRow[] {
  return Array.from({ length: INITIAL_ROW_COUNT }, (_, index) => blankRow(index + 1));
}

function errorReport(errors: PayrollValidationError[]): string {
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  return [
    "row,field,error",
    ...errors.map((error) => [
      error.rowNumber?.toString() ?? "file",
      error.field,
      error.message,
    ].map(escape).join(",")),
  ].join("\r\n");
}

export function PayrollInput({ tokenAddress, tokenSymbol, tokenDecimals }: {
  tokenAddress: `0x${string}`;
  tokenSymbol: string;
  tokenDecimals: number;
}) {
  const [rows, setRows] = useState<PayrollDraftRow[]>(initialRows);
  const [fileErrors, setFileErrors] = useState<PayrollValidationError[]>([]);
  const [importMessage, setImportMessage] = useState("No file selected.");
  const [dirty, setDirty] = useState(false);
  const nextId = useRef(INITIAL_ROW_COUNT + 1);
  const validation = useMemo(
    () => validatePayrollRows(rows, tokenDecimals),
    [rows, tokenDecimals],
  );
  const errors = fileErrors.length > 0 ? fileErrors : dirty ? validation.errors : [];
  const valid = dirty && rows.length > 0 && errors.length === 0;

  function updateRow(id: string, field: "recipient" | "amount" | "memo", value: string) {
    setFileErrors([]);
    setDirty(true);
    setRows((current) => current.map((row) => row.id === id ? { ...row, [field]: value } : row));
  }

  function addRow() {
    setFileErrors([]);
    setDirty(true);
    const id = nextId.current++;
    setRows((current) => [...current, blankRow(id)]);
  }

  function removeRow(id: string) {
    setFileErrors([]);
    setDirty(true);
    setRows((current) => current.filter((row) => row.id !== id));
  }

  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const parsed = parsePayrollCsv(await file.text(), tokenDecimals);
    setDirty(true);
    if (parsed.errors.length > 0) {
      setRows([]);
      setFileErrors(parsed.errors);
      setImportMessage(`${file.name}: blocked locally with ${parsed.errors.length} error${parsed.errors.length === 1 ? "" : "s"}.`);
      return;
    }

    setRows(parsed.rows.map(({ id, recipient, amount, memo }) => ({ id, recipient, amount, memo })));
    setFileErrors([]);
    setImportMessage(`${file.name}: ${parsed.rows.length} rows imported locally.`);
  }

  function downloadErrors() {
    const blob = new Blob([errorReport(errors)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "shadowledger-payroll-errors.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function resetForm() {
    setRows(initialRows());
    setFileErrors([]);
    setImportMessage("No file selected.");
    setDirty(false);
    nextId.current = INITIAL_ROW_COUNT + 1;
  }

  return (
    <section className={`shell ${styles.inputShell}`} aria-label="Local payroll input">
      <div className={styles.privacyBanner} role="status">
        <span className={styles.lock} aria-hidden="true">LOCAL</span>
        <div>
          <strong>Browser-only privacy boundary</strong>
          <p>Import and validation make zero application requests. Rows stay in this tab and are cleared on refresh.</p>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <article><p>Token</p><strong>{tokenSymbol}</strong><span>{tokenDecimals} decimals</span></article>
        <article><p>Rows</p><strong>{rows.length}</strong><span>Maximum 500</span></article>
        <article><p>Aggregate</p><strong>{formatTokenAmount(validation.totalUnits, tokenDecimals, tokenDecimals)}</strong><span>{tokenSymbol}</span></article>
        <article><p>Validation</p><strong className={valid ? styles.good : dirty ? styles.warn : ""}>{valid ? "Ready" : dirty ? `${errors.length} issue${errors.length === 1 ? "" : "s"}` : "Waiting"}</strong><span>Local checks only</span></article>
      </div>

      <div className={styles.controlGrid}>
        <article className="panel">
          <h2>Import CSV</h2>
          <p className="panel-copy">Use <code>recipient,amount,memo</code>. Header case and surrounding spaces are ignored; memo is optional.</p>
          <div className={styles.importActions}>
            <label className="primary-button" htmlFor="payroll-csv">Choose CSV</label>
            <input
              className={styles.fileInput}
              id="payroll-csv"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => void importCsv(event)}
            />
            <a className="secondary-button" href="/demo-payroll.csv" download>Download demo CSV</a>
          </div>
          <p className={styles.fileStatus} aria-live="polite">{importMessage}</p>
        </article>

        <article className="panel">
          <h2>Exact validation rules</h2>
          <ul className={styles.rules}>
            <li>Starknet account address, non-zero, no duplicates</li>
            <li>Plain decimal only; no negatives or scientific notation</li>
            <li>No more than {tokenDecimals} decimal places</li>
            <li>Aggregate must remain inside Starknet&apos;s felt range</li>
          </ul>
        </article>
      </div>

      {errors.length > 0 && (
        <section className={styles.errorPanel} aria-labelledby="payroll-errors" role="alert">
          <div>
            <p className="section-kicker">Fix before continuing</p>
            <h2 id="payroll-errors">{errors.length} local validation issue{errors.length === 1 ? "" : "s"}</h2>
          </div>
          <button className="secondary-button" type="button" onClick={downloadErrors}>Download error report</button>
          <ol>
            {errors.map((error, index) => (
              <li key={`${error.rowNumber ?? "file"}-${error.field}-${index}`}>
                <strong>{error.rowNumber ? `Row ${error.rowNumber}` : "CSV"} · {error.field}</strong>
                <span>{error.message}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className={styles.editor} aria-labelledby="payroll-editor-heading">
        <div className={styles.editorHeader}>
          <div>
            <p className="section-kicker">Manual payroll form</p>
            <h2 id="payroll-editor-heading">Recipient allocations</h2>
          </div>
          <div className={styles.editorActions}>
            <button className="secondary-button" type="button" onClick={resetForm}>Clear</button>
            <button className="primary-button" type="button" onClick={addRow}>Add recipient</button>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table>
            <thead><tr><th scope="col">#</th><th scope="col">Recipient</th><th scope="col">Amount ({tokenSymbol})</th><th scope="col">Memo (optional)</th><th scope="col"><span className={styles.srOnly}>Actions</span></th></tr></thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id}>
                  <th scope="row">{index + 1}</th>
                  <td><label className={styles.srOnly} htmlFor={`${row.id}-recipient`}>Recipient {index + 1}</label><input id={`${row.id}-recipient`} value={row.recipient} placeholder="0x…" autoComplete="off" spellCheck={false} onChange={(event) => updateRow(row.id, "recipient", event.target.value)} /></td>
                  <td><label className={styles.srOnly} htmlFor={`${row.id}-amount`}>Amount {index + 1}</label><input id={`${row.id}-amount`} value={row.amount} placeholder="0.00" inputMode="decimal" autoComplete="off" onChange={(event) => updateRow(row.id, "amount", event.target.value)} /></td>
                  <td><label className={styles.srOnly} htmlFor={`${row.id}-memo`}>Memo {index + 1}</label><input id={`${row.id}-memo`} value={row.memo} placeholder="Role or period" maxLength={160} autoComplete="off" onChange={(event) => updateRow(row.id, "memo", event.target.value)} /></td>
                  <td><button className={styles.removeButton} type="button" aria-label={`Remove recipient ${index + 1}`} onClick={() => removeRow(row.id)}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p className={styles.empty}>No payroll rows. Add a recipient or import a corrected CSV.</p>}
      </section>

      <CommitmentPanel
        rows={validation.rows}
        canGenerate={valid}
        token={tokenAddress}
        tokenSymbol={tokenSymbol}
        tokenDecimals={tokenDecimals}
      />
    </section>
  );
}
