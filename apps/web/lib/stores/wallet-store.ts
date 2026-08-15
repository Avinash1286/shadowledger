import type { WalletWithStarknetFeatures } from "@starknet-io/get-starknet-wallet-standard/features";
import { create } from "zustand";

import type { PrivacyWalletSession } from "@/lib/strk20/client";
import type {
  RedactedDiagnostic,
  SafeWalletError,
} from "@/lib/strk20/errors";

export type WalletPhase =
  | "discovering"
  | "ready"
  | "connecting"
  | "unsupported"
  | "loading-balance"
  | "connected"
  | "simulating"
  | "simulation-ready"
  | "submitting"
  | "confirming"
  | "submitted"
  | "error";

type WalletState = {
  wallets: readonly WalletWithStarknetFeatures[];
  discoveryReady: boolean;
  phase: WalletPhase;
  session: PrivacyWalletSession | null;
  shieldedBalance: bigint | null;
  safeError: SafeWalletError | null;
  diagnostic: RedactedDiagnostic | null;
  transactionHash: string | null;
  setWallets: (wallets: readonly WalletWithStarknetFeatures[]) => void;
  setPhase: (phase: WalletPhase) => void;
  setSession: (session: PrivacyWalletSession | null) => void;
  setShieldedBalance: (balance: bigint | null) => void;
  setFailure: (error: SafeWalletError, diagnostic: RedactedDiagnostic) => void;
  clearFailure: () => void;
  setTransactionHash: (hash: string | null) => void;
  reset: () => void;
};

const INITIAL_STATE = {
  wallets: [] as readonly WalletWithStarknetFeatures[],
  discoveryReady: false,
  phase: "discovering" as WalletPhase,
  session: null,
  shieldedBalance: null,
  safeError: null,
  diagnostic: null,
  transactionHash: null,
};

export const useWalletStore = create<WalletState>()((set) => ({
  ...INITIAL_STATE,
  setWallets: (wallets) => set({ wallets, discoveryReady: true, phase: "ready" }),
  setPhase: (phase) => set({ phase }),
  setSession: (session) => set({ session }),
  setShieldedBalance: (shieldedBalance) => set({ shieldedBalance }),
  setFailure: (safeError, diagnostic) => set({ safeError, diagnostic, phase: "error" }),
  clearFailure: () => set({ safeError: null, diagnostic: null }),
  setTransactionHash: (transactionHash) => set({ transactionHash }),
  reset: () => set({ ...INITIAL_STATE, discoveryReady: true, phase: "ready" }),
}));
