"use client";

import { createStore, type Store } from "@starknet-io/get-starknet-discovery";
import type { WalletWithStarknetFeatures } from "@starknet-io/get-starknet-wallet-standard/features";
import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { readPublicConfig, type PublicConfig } from "@/lib/config";
import { formatTokenAmount, parseTokenAmount } from "@/lib/strk20/amount";
import {
  addressesEqual,
  isStarknetAddress,
  shortAddress,
} from "@/lib/strk20/address";
import {
  confirmEligiblePoolTransaction,
  connectPrivacyWallet,
  disconnectPrivacyWallet,
  readShieldedBalance,
  simulatePrivateTransfer,
  simulateShield,
  submitPrivateTransfer,
  submitShield,
  type PrivacyWalletSession,
} from "@/lib/strk20/client";
import {
  createRedactedDiagnostic,
  SafeWalletError,
  toSafeWalletError,
  type WalletStage,
} from "@/lib/strk20/errors";
import { useWalletStore } from "@/lib/stores/wallet-store";

const MAX_DAY_ONE_SHIELD_STRK = 1n * 10n ** 18n;
const MAX_TECHNICAL_TRANSFER_STRK = 1n * 10n ** 17n;
const READY_WALLET_URL = "https://www.ready.co/ready-x";

type TransferPhase =
  | "idle"
  | "simulating"
  | "ready"
  | "submitting"
  | "confirming"
  | "submitted"
  | "error";

let discoveryStore: Store | null = null;

function getDiscoveryStore(): Store {
  discoveryStore ??= createStore({ eip1193Adapters: [] });
  return discoveryStore;
}

function preferReadyWallets(
  wallets: readonly WalletWithStarknetFeatures[],
): WalletWithStarknetFeatures[] {
  return [...wallets].sort((left, right) => {
    const leftReady = /ready|argent/i.test(left.name) ? 0 : 1;
    const rightReady = /ready|argent/i.test(right.name) ? 0 : 1;
    return leftReady - rightReady || left.name.localeCompare(right.name);
  });
}

export function WalletPanel() {
  const configResult = useMemo(() => readPublicConfig(), []);
  const {
    wallets,
    discoveryReady,
    phase,
    session,
    shieldedBalance,
    safeError,
    diagnostic,
    transactionHash,
    setWallets,
    setPhase,
    setSession,
    setShieldedBalance,
    setFailure,
    clearFailure,
    setTransactionHash,
    reset,
  } = useWalletStore();
  const [amount, setAmount] = useState("0.001");
  const [acknowledged, setAcknowledged] = useState(false);
  const [simulatedAmount, setSimulatedAmount] = useState<bigint | null>(null);
  const [shieldEligible, setShieldEligible] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [transferAmount, setTransferAmount] = useState("0.001");
  const [recipientReady, setRecipientReady] = useState(false);
  const [transferPhase, setTransferPhase] = useState<TransferPhase>("idle");
  const [simulatedTransfer, setSimulatedTransfer] = useState<{
    amount: bigint;
    recipient: `0x${string}`;
  } | null>(null);
  const [transferHash, setTransferHash] = useState<string | null>(null);
  const [transferEligible, setTransferEligible] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy redacted diagnostic");

  const config = configResult.ok ? configResult.config : null;
  const orderedWallets = useMemo(() => preferReadyWallets(wallets), [wallets]);
  const isBusy =
    ["connecting", "loading-balance", "simulating", "submitting", "confirming"].includes(
      phase,
    ) || ["simulating", "submitting", "confirming"].includes(transferPhase);
  const walletApiSupported = session?.capability.supported ?? null;

  useEffect(() => {
    const store = getDiscoveryStore();
    const update = (nextWallets: readonly WalletWithStarknetFeatures[]) => {
      setWallets(preferReadyWallets(nextWallets));
    };
    update(store.getWallets());
    const unsubscribe = store.subscribe(update);

    const refresh = () => {
      store._refreshInjectedWallets();
      update(store.getWallets());
    };
    window.addEventListener("focus", refresh);
    const refreshTimer = window.setTimeout(refresh, 800);

    return () => {
      window.clearTimeout(refreshTimer);
      window.removeEventListener("focus", refresh);
      unsubscribe();
    };
  }, [setWallets]);

  function fail(error: unknown, stage: WalletStage) {
    const normalized = toSafeWalletError(error);
    setFailure(
      normalized,
      createRedactedDiagnostic({
        error: normalized,
        stage,
        walletApiSupported,
      }),
    );
  }

  async function loadBalance(activeSession: PrivacyWalletSession, activeConfig: PublicConfig) {
    setPhase("loading-balance");
    try {
      const balance = await readShieldedBalance(activeSession, activeConfig.tokenAddress);
      setShieldedBalance(balance);
      setPhase("connected");
    } catch (error) {
      fail(error, "BALANCE_READ");
    }
  }

  async function connect(wallet: WalletWithStarknetFeatures) {
    clearFailure();
    setTransactionHash(null);
    setShieldedBalance(null);
    setSimulatedAmount(null);
    setShieldEligible(false);
    setTransferPhase("idle");
    setSimulatedTransfer(null);
    setTransferHash(null);
    setTransferEligible(false);

    if (!config) {
      fail(new SafeWalletError("CONFIGURATION_ERROR"), "CONFIGURATION");
      return;
    }

    setPhase("connecting");
    try {
      const nextSession = await connectPrivacyWallet(wallet, config);
      setSession(nextSession);
      if (!nextSession.capability.supported || !nextSession.account) {
        setPhase("unsupported");
        return;
      }
      await loadBalance(nextSession, config);
    } catch (error) {
      fail(error, "CONNECTING");
    }
  }

  async function refreshBalance() {
    clearFailure();
    if (!session || !config) return;
    await loadBalance(session, config);
  }

  async function disconnect() {
    if (session) {
      try {
        await disconnectPrivacyWallet(session);
      } catch {
        // Local state is still cleared. Raw wallet errors are never retained.
      }
    }
    reset();
    setSimulatedAmount(null);
    setAcknowledged(false);
    setShieldEligible(false);
    setRecipient("");
    setTransferAmount("0.001");
    setRecipientReady(false);
    setTransferPhase("idle");
    setSimulatedTransfer(null);
    setTransferHash(null);
    setTransferEligible(false);
  }

  function parsedAmount(): bigint {
    if (!config) throw new SafeWalletError("CONFIGURATION_ERROR");
    return parseTokenAmount(amount, config.tokenDecimals, MAX_DAY_ONE_SHIELD_STRK);
  }

  function updateAmount(nextAmount: string) {
    setAmount(nextAmount);
    setSimulatedAmount(null);
    setShieldEligible(false);
    if (phase === "simulation-ready") setPhase("connected");
  }

  async function previewShield() {
    clearFailure();
    setTransactionHash(null);
    if (!session || !config) return;
    setPhase("simulating");
    try {
      const units = parsedAmount();
      await simulateShield({ session, tokenAddress: config.tokenAddress, amount: units });
      setSimulatedAmount(units);
      setPhase("simulation-ready");
    } catch (error) {
      setSimulatedAmount(null);
      fail(error, "SHIELD_SIMULATING");
    }
  }

  async function shield(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFailure();
    if (!session || !config || !acknowledged) return;

    let hash: string;
    try {
      const units = parsedAmount();
      if (simulatedAmount !== units) {
        throw new SafeWalletError("INVALID_AMOUNT", "Simulate this exact amount before shielding.");
      }
      setPhase("submitting");
      hash = await submitShield({
        session,
        tokenAddress: config.tokenAddress,
        amount: units,
      });
    } catch (error) {
      fail(error, "SHIELD_SUBMITTING");
      return;
    }

    setTransactionHash(hash);
    setSimulatedAmount(null);
    setShieldEligible(false);
    setPhase("confirming");
    try {
      await confirmEligiblePoolTransaction({
        session,
        transactionHash: hash,
        poolAddress: config.poolAddress,
      });
      setShieldEligible(true);
      setPhase("submitted");
      await loadBalance(session, config);
    } catch (error) {
      fail(error, "SHIELD_CONFIRMING");
    }
  }

  function parsedTransferInput(): {
    amount: bigint;
    recipient: `0x${string}`;
  } {
    if (!config || !session) throw new SafeWalletError("CONFIGURATION_ERROR");
    const recipientAddress = recipient.trim();
    if (
      !isStarknetAddress(recipientAddress) ||
      BigInt(recipientAddress) === 0n ||
      addressesEqual(recipientAddress, session.address)
    ) {
      throw new SafeWalletError(
        "INVALID_RECIPIENT",
        "Use a valid, non-zero recipient address different from the sender.",
      );
    }

    return {
      recipient: recipientAddress,
      amount: parseTokenAmount(
        transferAmount,
        config.tokenDecimals,
        MAX_TECHNICAL_TRANSFER_STRK,
      ),
    };
  }

  function resetTransferSimulation() {
    setSimulatedTransfer(null);
    setTransferEligible(false);
    if (transferPhase !== "submitting" && transferPhase !== "confirming") {
      setTransferPhase("idle");
    }
  }

  async function previewPrivateTransfer() {
    clearFailure();
    setTransferHash(null);
    setTransferEligible(false);
    if (!session || !config || !recipientReady) return;

    setTransferPhase("simulating");
    try {
      const transfer = parsedTransferInput();
      await simulatePrivateTransfer({
        session,
        tokenAddress: config.tokenAddress,
        ...transfer,
      });
      setSimulatedTransfer(transfer);
      setTransferPhase("ready");
    } catch (error) {
      setSimulatedTransfer(null);
      setTransferPhase("error");
      fail(error, "TRANSFER_SIMULATING");
    }
  }

  async function transferPrivately(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFailure();
    if (!session || !config || !recipientReady) return;

    let hash: string;
    try {
      const transfer = parsedTransferInput();
      if (
        !simulatedTransfer ||
        simulatedTransfer.amount !== transfer.amount ||
        !addressesEqual(simulatedTransfer.recipient, transfer.recipient)
      ) {
        throw new SafeWalletError(
          "INVALID_REQUEST_PAYLOAD",
          "Simulate this exact recipient and amount before submitting.",
        );
      }

      setTransferPhase("submitting");
      hash = await submitPrivateTransfer({
        session,
        tokenAddress: config.tokenAddress,
        ...transfer,
      });
    } catch (error) {
      setTransferPhase("error");
      fail(error, "TRANSFER_SUBMITTING");
      return;
    }

    setTransferHash(hash);
    setSimulatedTransfer(null);
    setTransferPhase("confirming");
    try {
      await confirmEligiblePoolTransaction({
        session,
        transactionHash: hash,
        poolAddress: config.poolAddress,
      });
      setTransferEligible(true);
      setTransferPhase("submitted");
      await loadBalance(session, config);
    } catch (error) {
      setTransferPhase("error");
      fail(error, "TRANSFER_CONFIRMING");
    }
  }

  async function copyDiagnostic() {
    if (!diagnostic) return;
    await navigator.clipboard.writeText(JSON.stringify(diagnostic, null, 2));
    setCopyLabel("Copied");
    window.setTimeout(() => setCopyLabel("Copy redacted diagnostic"), 1500);
  }

  const walletLabel = session ? shortAddress(session.address) : "Not connected";
  const networkLabel = session ? "SN_MAIN" : config ? "Required: SN_MAIN" : "Configuration error";
  const capabilityLabel = session
    ? session.capability.supported
      ? `Wallet API ${session.capability.supportedVersions.join(", ")}`
      : "Unsupported"
    : "Not checked";
  const balanceLabel = config && shieldedBalance !== null
    ? `${formatTokenAmount(shieldedBalance, config.tokenDecimals)} ${config.tokenSymbol}`
    : "—";

  return (
    <section className="shell wallet-shell" aria-label="Wallet integration">
      <div className="status-grid">
        <article className="status-card">
          <p>Wallet</p>
          <strong title={session?.address}>{walletLabel}</strong>
        </article>
        <article className="status-card">
          <p>Network guard</p>
          <strong className={session ? "good" : config ? "warn" : ""}>{networkLabel}</strong>
        </article>
        <article className="status-card">
          <p>Privacy capability</p>
          <strong className={session?.capability.supported ? "good" : ""}>{capabilityLabel}</strong>
        </article>
        <article className="status-card">
          <p>Shielded balance</p>
          <strong>{balanceLabel}</strong>
        </article>
      </div>

      {!configResult.ok && (
        <div className="notice error" role="alert">
          Configuration blocked: {configResult.message} Copy the root <code>.env.example</code> to
          <code> apps/web/.env.local</code>, then restart the app.
        </div>
      )}

      {safeError && (
        <div className="notice error" role="alert">
          {safeError.message}
          {diagnostic && (
            <details className="diagnostic">
              <summary>Privacy-safe troubleshooting details</summary>
              <pre>{JSON.stringify(diagnostic, null, 2)}</pre>
              <button className="text-button" type="button" onClick={copyDiagnostic}>
                {copyLabel}
              </button>
            </details>
          )}
        </div>
      )}

      <div className="workspace-grid">
        <article className="panel">
          <h2>{session ? session.walletName : "Connect a privacy wallet"}</h2>
          <p className="panel-copy">
            Connection only continues after the wallet reports Starknet mainnet. Ready X is the
            explicitly supported wallet for this milestone.
          </p>

          {!session && (
            <div className="wallet-list">
              {!discoveryReady && <p className="notice">Scanning for Starknet wallets…</p>}
              {discoveryReady && orderedWallets.length === 0 && (
                <div className="notice warning">
                  No Starknet wallet was discovered. Install or unlock{" "}
                  <a href={READY_WALLET_URL} target="_blank" rel="noreferrer">Ready X</a>, then
                  return to this tab.
                </div>
              )}
              {orderedWallets.map((wallet) => (
                <button
                  className="wallet-option"
                  key={`${wallet.name}-${wallet.version}`}
                  type="button"
                  disabled={isBusy || !config}
                  onClick={() => void connect(wallet)}
                >
                  <b aria-hidden="true">{wallet.name.slice(0, 1).toUpperCase()}</b>
                  <strong>{wallet.name}</strong>
                  <span>Connect</span>
                </button>
              ))}
            </div>
          )}

          {session && (
            <>
              <ul className="detail-list">
                <li><span>Account</span><strong title={session.address}>{shortAddress(session.address)}</strong></li>
                <li><span>Chain</span><strong>Starknet Mainnet</strong></li>
                <li><span>Minimum Wallet API</span><strong>0.10.3</strong></li>
                <li><span>STRK20 actions</span><strong>{session.capability.supported ? "Available" : "Unavailable"}</strong></li>
                {config && <li><span>Pool</span><strong title={config.poolAddress}>{shortAddress(config.poolAddress)}</strong></li>}
              </ul>

              {!session.capability.supported && (
                <div className="notice warning">
                  Private actions remain disabled. Update or install{" "}
                  <a href={READY_WALLET_URL} target="_blank" rel="noreferrer">Ready X</a> with
                  Wallet API 0.10.3+ support, then reconnect.
                </div>
              )}

              <div className="action-row" style={{ marginTop: 18 }}>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={isBusy || !session.capability.supported}
                  onClick={() => void refreshBalance()}
                >
                  {phase === "loading-balance" ? "Reading…" : "Refresh private balance"}
                </button>
                <button className="secondary-button" type="button" disabled={isBusy} onClick={() => void disconnect()}>
                  Disconnect
                </button>
              </div>
            </>
          )}
        </article>

        <article className="panel">
          <h3>Tiny mainnet shield</h3>
          <p className="panel-copy">
            Deposit public STRK into the private pool. The wallet owns note discovery and proving;
            this app receives no viewing key.
          </p>

          <form onSubmit={(event) => void shield(event)}>
            <div className="field">
              <label htmlFor="shield-amount">Amount in STRK</label>
              <input
                id="shield-amount"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                disabled={!session?.account || isBusy}
                onChange={(event) => updateAmount(event.target.value)}
                aria-describedby="shield-help"
              />
              <small id="shield-help">Safety cap: 1 STRK. Recommended first proof: 0.001 STRK. Gas also applies.</small>
            </div>

            <label className="check-row">
              <input
                type="checkbox"
                checked={acknowledged}
                disabled={!session?.account || isBusy}
                onChange={(event) => setAcknowledged(event.target.checked)}
              />
              <span>I understand shielding is a public mainnet transaction and I will review the Ready wallet prompt.</span>
            </label>

            <div className="action-row">
              <button
                className="secondary-button"
                type="button"
                disabled={!session?.account || isBusy}
                onClick={() => void previewShield()}
              >
                {phase === "simulating" ? "Simulating…" : "Simulate"}
              </button>
              <button
                className="primary-button"
                type="submit"
                disabled={!session?.account || !acknowledged || simulatedAmount === null || isBusy}
              >
                {phase === "submitting" ? "Waiting for wallet…" : "Shield on mainnet"}
              </button>
            </div>
          </form>

          {phase === "simulation-ready" && (
            <div className="notice success">Simulation passed for this exact amount. Submission still requires your wallet approval.</div>
          )}

          {transactionHash && (
            <div className="notice success">
              {shieldEligible
                ? "Succeeded, accepted, and verified against the configured STRK20 pool. Save this as eligible evidence. "
                : "Wallet submitted the transaction. Confirmation and pool-event verification are in progress or need retrying. "}
              <a href={`https://voyager.online/tx/${transactionHash}`} target="_blank" rel="noreferrer">
                Open in Voyager
              </a>
            </div>
          )}
        </article>
      </div>

      <div className="workspace-grid transfer-workspace">
        <article className="panel">
          <h2>Tiny private transfer</h2>
          <p className="panel-copy">
            Send one technical STRK20 payment only after the recipient independently
            passes the activation check. There is no public-transfer fallback.
          </p>

          <form onSubmit={(event) => void transferPrivately(event)}>
            <div className="field">
              <label htmlFor="private-recipient">Registered recipient address</label>
              <input
                id="private-recipient"
                type="text"
                inputMode="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="0x…"
                value={recipient}
                disabled={!session?.account || isBusy}
                onChange={(event) => {
                  setRecipient(event.target.value);
                  resetTransferSimulation();
                }}
                aria-describedby="private-recipient-help"
              />
              <small id="private-recipient-help">
                Keep the address mapping private. The sender cannot query another
                account&apos;s registration through Wallet API 0.10.3.
              </small>
            </div>

            <div className="field">
              <label htmlFor="private-transfer-amount">Amount in STRK</label>
              <input
                id="private-transfer-amount"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={transferAmount}
                disabled={!session?.account || isBusy}
                onChange={(event) => {
                  setTransferAmount(event.target.value);
                  resetTransferSimulation();
                }}
                aria-describedby="private-transfer-help"
              />
              <small id="private-transfer-help">
                Technical-payment cap: 0.1 STRK. The privacy action fee and gas are
                additional; review the complete Ready X prompt before approving.
              </small>
            </div>

            <label className="check-row">
              <input
                type="checkbox"
                checked={recipientReady}
                disabled={!session?.account || isBusy}
                onChange={(event) => {
                  setRecipientReady(event.target.checked);
                  resetTransferSimulation();
                }}
              />
              <span>
                I verified this exact recipient account as <strong>Ready to receive</strong>
                on the activation page.
              </span>
            </label>

            <div className="action-row">
              <button
                className="secondary-button"
                type="button"
                disabled={!session?.account || !recipientReady || isBusy}
                onClick={() => void previewPrivateTransfer()}
              >
                {transferPhase === "simulating" ? "Simulating…" : "Simulate private transfer"}
              </button>
              <button
                className="primary-button"
                type="submit"
                disabled={
                  !session?.account ||
                  !recipientReady ||
                  !simulatedTransfer ||
                  isBusy
                }
              >
                {transferPhase === "submitting"
                  ? "Waiting for wallet…"
                  : transferPhase === "confirming"
                    ? "Confirming on-chain…"
                    : "Send privately"}
              </button>
            </div>
          </form>

          {transferPhase === "ready" && (
            <div className="notice success">
              Simulation passed for this exact recipient and amount. The real action
              still requires a separate Ready X approval.
            </div>
          )}

          {transferHash && (
            <div className={transferEligible ? "notice success" : "notice warning"}>
              {transferEligible
                ? "Succeeded, accepted, and verified against the configured STRK20 pool. "
                : "The hash is preserved, but eligibility confirmation is incomplete. Do not retry blindly. "}
              <a
                href={`https://voyager.online/tx/${transferHash}`}
                target="_blank"
                rel="noreferrer"
              >
                Open in Voyager
              </a>
            </div>
          )}
        </article>

        <article className="panel activation-card">
          <p className="section-kicker">Recipient gate</p>
          <h2>Activate and verify three demo recipients first.</h2>
          <p className="panel-copy">
            Each recipient opens Ready X, enables its privacy flow, then connects to
            ShadowLedger for a mainnet capability and private-balance check.
          </p>
          <Link className="primary-link" href="/recipient/activate">
            Open recipient activation
          </Link>
          <ul className="detail-list">
            <li><span>Recipient A</span><strong>Required for this transfer</strong></li>
            <li><span>Recipient B</span><strong>Prepare for payroll batch</strong></li>
            <li><span>Recipient C</span><strong>Prepare for payroll batch</strong></li>
          </ul>
          <div className="notice warning">
            Registration and every privacy action are mainnet operations. Review all
            fees and gas in Ready X; never expose a recovery or viewing key.
          </div>
        </article>
      </div>
    </section>
  );
}
