"use client";

import { createStore, type Store } from "@starknet-io/get-starknet-discovery";
import type { WalletWithStarknetFeatures } from "@starknet-io/get-starknet-wallet-standard/features";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { readPublicConfig, type PublicConfig } from "@/lib/config";
import { formatTokenAmount, parseTokenAmount } from "@/lib/strk20/amount";
import { shortAddress } from "@/lib/strk20/address";
import {
  connectPrivacyWallet,
  disconnectPrivacyWallet,
  readShieldedBalance,
  simulateShield,
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
const READY_WALLET_URL = "https://www.ready.co/ready-x";

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
  const [copyLabel, setCopyLabel] = useState("Copy redacted diagnostic");

  const config = configResult.ok ? configResult.config : null;
  const orderedWallets = useMemo(() => preferReadyWallets(wallets), [wallets]);
  const isBusy = ["connecting", "loading-balance", "simulating", "submitting"].includes(phase);
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
  }

  function parsedAmount(): bigint {
    if (!config) throw new SafeWalletError("CONFIGURATION_ERROR");
    return parseTokenAmount(amount, config.tokenDecimals, MAX_DAY_ONE_SHIELD_STRK);
  }

  function updateAmount(nextAmount: string) {
    setAmount(nextAmount);
    setSimulatedAmount(null);
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

    try {
      const units = parsedAmount();
      if (simulatedAmount !== units) {
        throw new SafeWalletError("INVALID_AMOUNT", "Simulate this exact amount before shielding.");
      }
      setPhase("submitting");
      const hash = await submitShield({
        session,
        tokenAddress: config.tokenAddress,
        amount: units,
      });
      setTransactionHash(hash);
      setSimulatedAmount(null);
      setPhase("submitted");
    } catch (error) {
      fail(error, "SHIELD_SUBMITTING");
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
              Wallet submitted the transaction. Verify its final status and pool interaction before adding it to evidence.{" "}
              <a href={`https://voyager.online/tx/${transactionHash}`} target="_blank" rel="noreferrer">
                Open in Voyager
              </a>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
