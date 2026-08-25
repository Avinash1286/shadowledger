"use client";

import { useMemo, useState } from "react";
import type { PayrollCommitment } from "@/lib/payroll/commitment-types";
import type { ValidatedPayrollRow } from "@/lib/payroll/types";
import { createRegistryRun, finalizeRegistryRun } from "@/lib/registry/client";
import { assembleUnsignedPortableReceipt, signPortableReceipt } from "@/lib/receipts/portable";
import {
  confirmEligiblePoolTransaction,
  simulatePayrollBatch,
  submitPayrollBatch,
} from "@/lib/strk20/client";
import { createRedactedDiagnostic, toSafeWalletError, type WalletStage } from "@/lib/strk20/errors";
import { assessExactBatchFunding, buildPayrollBatch } from "@/lib/strk20/payroll-batch";
import { useWalletStore } from "@/lib/stores/wallet-store";

import styles from "./payroll-execution-panel.module.css";

type Phase = "idle" | "simulating" | "ready" | "submitting" | "confirming" | "paid" | "finalized" | "error";

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function PayrollExecutionPanel({
  commitment,
  rows,
  period,
  poolAddress,
  registryAddress,
}: {
  commitment: PayrollCommitment;
  rows: readonly ValidatedPayrollRow[];
  period: string;
  poolAddress: `0x${string}`;
  registryAddress: `0x${string}` | null;
}) {
  const session = useWalletStore((state) => state.session);
  const shieldedBalance = useWalletStore((state) => state.shieldedBalance);
  const [phase, setPhase] = useState<Phase>("idle");
  const [registryCreateHash, setRegistryCreateHash] = useState<string | null>(null);
  const [strk20TxHash, setStrk20TxHash] = useState<string | null>(null);
  const [registryFinalizeHash, setRegistryFinalizeHash] = useState<string | null>(null);
  const [recoveryHash, setRecoveryHash] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<object | null>(null);
  const [receiptIndex, setReceiptIndex] = useState("0");
  const batch = useMemo(() => buildPayrollBatch(commitment.entries), [commitment]);
  const funding = useMemo(
    () => assessExactBatchFunding(batch.aggregateAmount, shieldedBalance),
    [batch.aggregateAmount, shieldedBalance],
  );

  function fail(cause: unknown, stage: WalletStage) {
    const safe = toSafeWalletError(cause);
    setPhase("error");
    setMessage(safe.message);
    setDiagnostic(createRedactedDiagnostic({
      error: cause,
      stage,
      walletApiSupported: session?.capability.supported ?? null,
    }));
  }

  async function createRun() {
    if (!session || !registryAddress) return;
    setMessage("Confirm the public registry transaction in your wallet.");
    try {
      const result = await createRegistryRun({
        session,
        registryAddress,
        run: {
          runId: commitment.runId,
          token: commitment.manifest.token,
          aggregateAmount: BigInt(commitment.manifest.aggregateAmount),
          recipientCount: commitment.manifest.recipientCount,
          periodHash: commitment.periodHash,
          merkleRoot: commitment.merkleRoot,
          manifestHash: commitment.manifestHash,
        },
      });
      setRegistryCreateHash(result.transactionHash);
      setMessage("Registry run created and read back from mainnet.");
    } catch (cause) {
      fail(cause, "BATCH_SUBMITTING");
    }
  }

  async function simulate() {
    if (!session) return;
    setPhase("simulating");
    setMessage("Preparing one wallet simulation for the complete private batch.");
    setDiagnostic(null);
    try {
      await simulatePayrollBatch({ session, entries: commitment.entries });
      setPhase("ready");
      setMessage("Wallet simulation succeeded for all recipients. Review and submit explicitly.");
    } catch (cause) {
      fail(cause, "BATCH_SIMULATING");
    }
  }

  async function submit() {
    if (!session || phase !== "ready" || !acknowledged) return;
    setPhase("submitting");
    setMessage("The wallet repeats simulation before showing the submission approval.");
    try {
      const hash = await submitPayrollBatch({ session, entries: commitment.entries });
      setStrk20TxHash(hash);
      setPhase("confirming");
      setMessage("Transaction submitted. Waiting for accepted STRK20 pool evidence.");
      await confirm(hash);
    } catch (cause) {
      fail(cause, "BATCH_SUBMITTING");
    }
  }

  async function confirm(hash = strk20TxHash ?? recoveryHash.trim()) {
    if (!session || !hash) return;
    setPhase("confirming");
    try {
      await confirmEligiblePoolTransaction({ session, transactionHash: hash, poolAddress });
      setStrk20TxHash(hash);
      setPhase("paid");
      setMessage("The transaction is accepted and contains an event from the configured STRK20 pool.");
    } catch (cause) {
      fail(cause, "BATCH_CONFIRMING");
    }
  }

  async function finalize() {
    if (!session || !registryAddress || !registryCreateHash || !strk20TxHash) return;
    setMessage("Confirm finalization in your wallet. This binds the accepted pool transaction to the run.");
    try {
      const result = await finalizeRegistryRun({
        session,
        registryAddress,
        runId: commitment.runId,
        strk20TxHash: BigInt(strk20TxHash),
      });
      setRegistryFinalizeHash(result.transactionHash);
      setPhase("finalized");
      setMessage("Registry finalization was confirmed and read back from mainnet.");
    } catch (cause) {
      fail(cause, "BATCH_SUBMITTING");
    }
  }

  async function createReceipt() {
    if (!session || !registryAddress || !strk20TxHash || !registryFinalizeHash) return;
    try {
      const unsigned = assembleUnsignedPortableReceipt({
        commitment,
        rows,
        index: Number(receiptIndex),
        payer: session.address,
        registryAddress,
        strk20TxHash,
        period,
      });
      const receipt = await signPortableReceipt({ session, receipt: unsigned });
      downloadJson(`shadowledger-receipt-${Number(receiptIndex) + 1}.json`, receipt);
      setMessage(`Signed portable receipt ${Number(receiptIndex) + 1} downloaded locally.`);
    } catch (cause) {
      fail(cause, "RECEIPT_SIGNING");
    }
  }

  const evidence = {
    schema: "shadowledger/mainnet-run-evidence/v1",
    network: "SN_MAIN",
    runId: commitment.manifest.runId,
    registryCreateHash,
    strk20TxHash,
    registryFinalizeHash,
  };

  return (
    <section className={styles.execution} aria-labelledby="execution-heading">
      <div className={styles.heading}>
        <div><p className="section-kicker">August 22–24 · explicit mainnet state machine</p><h3 id="execution-heading">Simulate, pay, finalize, prove.</h3></div>
        <span>{phase}</span>
      </div>

      <div className={styles.metrics}>
        <div><small>Private actions</small><strong>{batch.recipientCount}</strong></div>
        <div><small>Exact batch total</small><strong>{batch.aggregateAmount.toString()}</strong></div>
        <div><small>Private balance</small><strong>{shieldedBalance?.toString() ?? "Not read"}</strong></div>
      </div>
      <p className={funding.ready ? styles.good : styles.warn}>{funding.note}</p>

      {!session && <div className="notice warning">Connect the privacy wallet in the section above, then return here. No payroll data is sent during connection.</div>}
      {!registryAddress && <div className="notice warning">Mainnet registry address is not configured. Batch simulation remains available, but create/finalize and signed receipts are blocked.</div>}

      <ol className={styles.steps}>
        <li>
          <div><strong>Create public run</strong><small>{registryCreateHash ?? "Not submitted"}</small></div>
          <button className="secondary-button" type="button" disabled={!session || !registryAddress || Boolean(registryCreateHash)} onClick={() => void createRun()}>Create registry run</button>
        </li>
        <li>
          <div><strong>Simulate all private transfers</strong><small>One ordered action array · no state change</small></div>
          <button className="secondary-button" type="button" disabled={!session || !funding.ready || phase === "simulating" || phase === "submitting"} onClick={() => void simulate()}>{phase === "ready" ? "Simulate again" : "Simulate batch"}</button>
        </li>
        <li>
          <label className="check-row"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />I checked all recipient addresses and understand one approval submits the complete private batch.</label>
          <button className="primary-button" type="button" disabled={phase !== "ready" || !acknowledged || !registryCreateHash} onClick={() => void submit()}>Submit private batch</button>
        </li>
        <li>
          <div className="field"><label htmlFor="recovery-hash">Recover confirmation by transaction hash</label><input id="recovery-hash" value={recoveryHash} placeholder="0x…" onChange={(event) => setRecoveryHash(event.target.value)} /></div>
          <button className="secondary-button" type="button" disabled={!session || (!strk20TxHash && !recoveryHash.trim()) || phase === "confirming"} onClick={() => void confirm()}>Resume pool confirmation</button>
        </li>
        <li>
          <div><strong>Finalize public run</strong><small>{registryFinalizeHash ?? "Requires accepted pool evidence"}</small></div>
          <button className="primary-button" type="button" disabled={!session || !registryAddress || !registryCreateHash || !strk20TxHash || phase !== "paid"} onClick={() => void finalize()}>Finalize registry</button>
        </li>
      </ol>

      {message && <div className={phase === "error" ? "notice error" : phase === "finalized" ? "notice success" : "notice"} role="status">{message}</div>}
      {diagnostic && <details className="diagnostic"><summary>Redacted recovery diagnostic</summary><pre>{JSON.stringify(diagnostic, null, 2)}</pre></details>}

      <div className={styles.artifacts}>
        <button className="secondary-button" type="button" disabled={!registryFinalizeHash} onClick={() => downloadJson("shadowledger-mainnet-run-evidence.json", evidence)}>Download transaction evidence</button>
        <div className="field">
          <label htmlFor="receipt-index">Recipient receipt</label>
          <select id="receipt-index" value={receiptIndex} onChange={(event) => setReceiptIndex(event.target.value)}>
            {commitment.entries.map((entry) => <option key={entry.index} value={entry.index}>Recipient {entry.index + 1}</option>)}
          </select>
        </div>
        <button className="secondary-button" type="button" disabled={!registryFinalizeHash} onClick={() => void createReceipt()}>Sign and download receipt</button>
      </div>
      <p className={styles.privacy}>Gas fees are separate from the exact shielded payroll total. Every transaction button causes its own wallet prompt; rejected prompts send nothing.</p>
    </section>
  );
}
