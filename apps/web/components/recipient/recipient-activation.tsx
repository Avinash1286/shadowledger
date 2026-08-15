"use client";

import { createStore, type Store } from "@starknet-io/get-starknet-discovery";
import type { WalletWithStarknetFeatures } from "@starknet-io/get-starknet-wallet-standard/features";
import { useEffect, useMemo, useState } from "react";

import { readPublicConfig, type PublicConfig } from "@/lib/config";
import { shortAddress } from "@/lib/strk20/address";
import {
  connectPrivacyWallet,
  disconnectPrivacyWallet,
  readShieldedBalance,
  type PrivacyWalletSession,
} from "@/lib/strk20/client";
import {
  createRedactedDiagnostic,
  SafeWalletError,
  toSafeWalletError,
  type WalletStage,
} from "@/lib/strk20/errors";
import {
  assessRecipientReadiness,
  type RegistrationCheck,
} from "@/lib/strk20/recipient-readiness";
import { useWalletStore } from "@/lib/stores/wallet-store";

import styles from "./recipient-activation.module.css";

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

function registrationLabel(registration: RegistrationCheck): string {
  switch (registration) {
    case "unchecked":
      return "Not checked";
    case "checking":
      return "Checking…";
    case "registered":
      return "Confirmed";
    case "not-registered":
      return "Activation needed";
    case "check-failed":
      return "Not confirmed";
  }
}

export function RecipientActivation() {
  const configResult = useMemo(() => readPublicConfig(), []);
  const {
    wallets,
    discoveryReady,
    session,
    safeError,
    diagnostic,
    setWallets,
    setPhase,
    setSession,
    setShieldedBalance,
    setFailure,
    clearFailure,
    reset,
  } = useWalletStore();
  const [registration, setRegistration] =
    useState<RegistrationCheck>("unchecked");
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);

  const config = configResult.ok ? configResult.config : null;
  const orderedWallets = useMemo(() => preferReadyWallets(wallets), [wallets]);
  const readiness = assessRecipientReadiness({
    configurationValid: configResult.ok,
    discoveryReady,
    walletDiscovered: orderedWallets.length > 0,
    connected: session !== null,
    mainnet: session?.chainId === "SN_MAIN",
    capabilitySupported: session?.capability.supported ?? null,
    registration,
  });
  const busy = connectingWallet !== null || registration === "checking";

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

  function fail(
    error: unknown,
    stage: WalletStage,
    walletApiSupported = session?.capability.supported ?? null,
  ) {
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

  async function verifyRegistration(
    activeSession: PrivacyWalletSession,
    activeConfig: PublicConfig,
  ) {
    if (!activeSession.account || !activeSession.capability.supported) return;

    clearFailure();
    setRegistration("checking");
    setPhase("loading-balance");
    try {
      const balance = await readShieldedBalance(
        activeSession,
        activeConfig.tokenAddress,
      );
      setShieldedBalance(balance);
      setRegistration("registered");
      setPhase("connected");
    } catch (error) {
      const normalized = toSafeWalletError(error);
      setPhase("connected");
      if (normalized.code === "NOT_REGISTERED") {
        clearFailure();
        setRegistration("not-registered");
        return;
      }

      setRegistration("check-failed");
      fail(error, "BALANCE_READ", activeSession.capability.supported);
    }
  }

  async function connect(wallet: WalletWithStarknetFeatures) {
    clearFailure();
    setRegistration("unchecked");
    setShieldedBalance(null);

    if (!config) {
      fail(new SafeWalletError("CONFIGURATION_ERROR"), "CONFIGURATION");
      return;
    }

    setConnectingWallet(wallet.name);
    setPhase("connecting");
    try {
      const nextSession = await connectPrivacyWallet(wallet, config);
      setSession(nextSession);
      if (!nextSession.capability.supported || !nextSession.account) {
        setPhase("unsupported");
        return;
      }

      setPhase("connected");
      await verifyRegistration(nextSession, config);
    } catch (error) {
      fail(error, "CONNECTING");
    } finally {
      setConnectingWallet(null);
    }
  }

  async function checkRegistration() {
    if (!session || !config) return;
    await verifyRegistration(session, config);
  }

  async function disconnect() {
    if (session) {
      try {
        await disconnectPrivacyWallet(session);
      } catch {
        // The local session is cleared even when the wallet rejects disconnect.
      }
    }
    reset();
    setRegistration("unchecked");
    setConnectingWallet(null);
  }

  const walletLabel = session ? shortAddress(session.address) : "Not connected";
  const networkLabel = session ? "SN_MAIN verified" : "Required: SN_MAIN";
  const capabilityLabel = session
    ? session.capability.supported
      ? `API ${session.capability.supportedVersions.join(", ")}`
      : "Unsupported"
    : "Not checked";
  const readinessToneClass = styles[readiness.tone] ?? "";

  return (
    <section
      className={`shell ${styles.activationShell}`}
      aria-label="Recipient readiness check"
    >
      <div className="status-grid">
        <article className="status-card">
          <p>Recipient wallet</p>
          <strong title={session?.address}>{walletLabel}</strong>
        </article>
        <article className="status-card">
          <p>Network guard</p>
          <strong className={session ? "good" : "warn"}>{networkLabel}</strong>
        </article>
        <article className="status-card">
          <p>Privacy capability</p>
          <strong className={session?.capability.supported ? "good" : ""}>
            {capabilityLabel}
          </strong>
        </article>
        <article className="status-card">
          <p>STRK20 registration</p>
          <strong className={registration === "registered" ? "good" : ""}>
            {registrationLabel(registration)}
          </strong>
        </article>
      </div>

      <div
        className={`${styles.readinessBanner} ${readinessToneClass}`}
        role="status"
        aria-live="polite"
      >
        <div className={styles.readinessMark} aria-hidden="true">
          {readiness.ready ? "✓" : "·"}
        </div>
        <div>
          <h2>{readiness.title}</h2>
          <p>{readiness.detail}</p>
        </div>
      </div>

      {!configResult.ok && (
        <div className="notice error" role="alert">
          Configuration blocked: {configResult.message}
        </div>
      )}

      {safeError && (
        <div className="notice error" role="alert">
          {safeError.message}
          {diagnostic && (
            <details className="diagnostic">
              <summary>Privacy-safe troubleshooting details</summary>
              <pre>{JSON.stringify(diagnostic, null, 2)}</pre>
            </details>
          )}
        </div>
      )}

      <div className="workspace-grid">
        <article className="panel">
          <h2>{session ? session.walletName : "Connect the recipient account"}</h2>
          <p className="panel-copy">
            Use the exact account that should receive private payroll. The strict
            network guard rejects every chain except Starknet Mainnet.
          </p>

          {!session && (
            <div className="wallet-list">
              {!discoveryReady && <p className="notice">Scanning for Starknet wallets…</p>}
              {discoveryReady && orderedWallets.length === 0 && (
                <div className="notice warning">
                  No compatible wallet was discovered. Install or unlock{" "}
                  <a href={READY_WALLET_URL} target="_blank" rel="noreferrer">
                    Ready X
                  </a>
                  , then return to this tab.
                </div>
              )}
              {orderedWallets.map((wallet) => (
                <button
                  className="wallet-option"
                  key={`${wallet.name}-${wallet.version}`}
                  type="button"
                  disabled={busy || !config}
                  onClick={() => void connect(wallet)}
                >
                  <b aria-hidden="true">{wallet.name.slice(0, 1).toUpperCase()}</b>
                  <strong>{wallet.name}</strong>
                  <span>
                    {connectingWallet === wallet.name ? "Connecting…" : "Connect"}
                  </span>
                </button>
              ))}
            </div>
          )}

          {session && (
            <>
              <ul className="detail-list">
                <li>
                  <span>Account</span>
                  <strong title={session.address}>{shortAddress(session.address)}</strong>
                </li>
                <li>
                  <span>Chain</span>
                  <strong>Starknet Mainnet</strong>
                </li>
                <li>
                  <span>Minimum Wallet API</span>
                  <strong>0.10.3</strong>
                </li>
                <li>
                  <span>Registration check</span>
                  <strong>{registrationLabel(registration)}</strong>
                </li>
              </ul>

              {!session.capability.supported && (
                <div className="notice warning">
                  Update or install{" "}
                  <a href={READY_WALLET_URL} target="_blank" rel="noreferrer">
                    Ready X
                  </a>{" "}
                  with Wallet API 0.10.3+ support, then reconnect.
                </div>
              )}

              <div className="action-row" style={{ marginTop: 18 }}>
                <button
                  className="primary-button"
                  type="button"
                  disabled={!session.account || busy || !config}
                  onClick={() => void checkRegistration()}
                >
                  {registration === "checking"
                    ? "Checking with wallet…"
                    : registration === "registered"
                      ? "Check readiness again"
                      : "Check registration"}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={busy}
                  onClick={() => void disconnect()}
                >
                  Disconnect
                </button>
              </div>
            </>
          )}
        </article>

        <article className="panel">
          <h2>One-time Ready X privacy activation</h2>
          <p className="panel-copy">
            Wallet API 0.10.3 can check private-balance access, but it exposes no
            registration action. Activation must be completed by this recipient
            inside Ready X; ShadowLedger never handles the viewing key.
          </p>

          <ol className={styles.steps}>
            <li>Open and unlock Ready X, then choose this exact recipient account.</li>
            <li>Confirm Starknet Mainnet before opening its privacy or Shield Mode flow.</li>
            <li>Complete the one-time activation and review its on-chain prompt.</li>
            <li>Return here and check registration again.</li>
          </ol>

          <a
            className={styles.officialLink}
            href={READY_WALLET_URL}
            target="_blank"
            rel="noreferrer"
          >
            Open Ready X information <span aria-hidden="true">↗</span>
          </a>
          <p className={styles.finePrint}>
            Activation is an on-chain action. Review the account, Mainnet network,
            privacy action, fee, and gas in the wallet before approving.
          </p>
        </article>
      </div>

      <aside className={styles.privacyBoundary}>
        <strong>Local privacy boundary</strong>
        <p>
          This flow sends no recipient data to a ShadowLedger API and stores no recipient
          record. Wallet discovery stays in the browser; chain and registration checks go
          only through the connected wallet and configured mainnet RPC. Viewing keys never
          enter app state.
        </p>
      </aside>
    </section>
  );
}
