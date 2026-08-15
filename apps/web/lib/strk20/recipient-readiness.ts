export type RegistrationCheck =
  | "unchecked"
  | "checking"
  | "registered"
  | "not-registered"
  | "check-failed";

export type RecipientReadinessCode =
  | "configuration-blocked"
  | "discovering-wallets"
  | "wallet-not-installed"
  | "wallet-not-connected"
  | "wrong-network"
  | "checking-capability"
  | "privacy-unsupported"
  | "registration-unchecked"
  | "checking-registration"
  | "activation-required"
  | "registration-unverified"
  | "ready";

export type RecipientReadiness = {
  code: RecipientReadinessCode;
  ready: boolean;
  tone: "neutral" | "warning" | "danger" | "success";
  title: string;
  detail: string;
};

export type RecipientReadinessInput = {
  configurationValid: boolean;
  discoveryReady: boolean;
  walletDiscovered: boolean;
  connected: boolean;
  mainnet: boolean;
  capabilitySupported: boolean | null;
  registration: RegistrationCheck;
};

const READINESS: Record<RecipientReadinessCode, RecipientReadiness> = {
  "configuration-blocked": {
    code: "configuration-blocked",
    ready: false,
    tone: "danger",
    title: "Mainnet configuration is blocked",
    detail: "ShadowLedger must have valid Starknet mainnet, pool, and token settings before readiness can be checked.",
  },
  "discovering-wallets": {
    code: "discovering-wallets",
    ready: false,
    tone: "neutral",
    title: "Looking for a privacy wallet",
    detail: "Unlock your Starknet wallet and keep this tab open while wallet discovery finishes.",
  },
  "wallet-not-installed": {
    code: "wallet-not-installed",
    ready: false,
    tone: "warning",
    title: "No Starknet wallet was found",
    detail: "Install or enable Ready X, then return to this tab and retry discovery.",
  },
  "wallet-not-connected": {
    code: "wallet-not-connected",
    ready: false,
    tone: "neutral",
    title: "Connect the recipient wallet",
    detail: "Choose the exact mainnet account that should receive private payroll.",
  },
  "wrong-network": {
    code: "wrong-network",
    ready: false,
    tone: "danger",
    title: "Starknet Mainnet is required",
    detail: "Switch the connected wallet to Starknet Mainnet and reconnect. No fallback network is allowed.",
  },
  "checking-capability": {
    code: "checking-capability",
    ready: false,
    tone: "neutral",
    title: "Checking privacy support",
    detail: "ShadowLedger is waiting for the wallet to report its supported Wallet API versions.",
  },
  "privacy-unsupported": {
    code: "privacy-unsupported",
    ready: false,
    tone: "warning",
    title: "This wallet cannot receive through STRK20 here",
    detail: "Wallet API 0.10.3 or newer is required. Update Ready X or connect another compatible wallet.",
  },
  "registration-unchecked": {
    code: "registration-unchecked",
    ready: false,
    tone: "neutral",
    title: "Registration has not been checked",
    detail: "Ask the wallet for private-balance access to confirm whether this account is registered with STRK20.",
  },
  "checking-registration": {
    code: "checking-registration",
    ready: false,
    tone: "neutral",
    title: "Checking STRK20 registration",
    detail: "The request stays between this browser, the wallet, and the configured Starknet mainnet RPC.",
  },
  "activation-required": {
    code: "activation-required",
    ready: false,
    tone: "warning",
    title: "Activate this account before payroll",
    detail: "The wallet reported that this account is not registered with the STRK20 privacy pool.",
  },
  "registration-unverified": {
    code: "registration-unverified",
    ready: false,
    tone: "danger",
    title: "Registration could not be confirmed",
    detail: "ShadowLedger has made no readiness claim. Resolve the safe wallet error, then run the check again.",
  },
  ready: {
    code: "ready",
    ready: true,
    tone: "success",
    title: "Ready to receive private payroll",
    detail: "The wallet confirmed STRK20 private-balance access for this mainnet account.",
  },
};

export function assessRecipientReadiness(
  input: RecipientReadinessInput,
): RecipientReadiness {
  if (!input.configurationValid) return READINESS["configuration-blocked"];

  if (!input.connected) {
    if (!input.discoveryReady) return READINESS["discovering-wallets"];
    if (!input.walletDiscovered) return READINESS["wallet-not-installed"];
    return READINESS["wallet-not-connected"];
  }

  if (!input.mainnet) return READINESS["wrong-network"];
  if (input.capabilitySupported === null) return READINESS["checking-capability"];
  if (!input.capabilitySupported) return READINESS["privacy-unsupported"];

  switch (input.registration) {
    case "unchecked":
      return READINESS["registration-unchecked"];
    case "checking":
      return READINESS["checking-registration"];
    case "not-registered":
      return READINESS["activation-required"];
    case "check-failed":
      return READINESS["registration-unverified"];
    case "registered":
      return READINESS.ready;
  }
}
