export type WalletStage =
  | "CONFIGURATION"
  | "CONNECTING"
  | "CHAIN_CHECK"
  | "CAPABILITY_CHECK"
  | "BALANCE_READ"
  | "SHIELD_SIMULATING"
  | "SHIELD_SUBMITTING";

export type SafeErrorCode =
  | "CONFIGURATION_ERROR"
  | "WRONG_NETWORK"
  | "NO_ACCOUNT"
  | "USER_REJECTED"
  | "UNSUPPORTED_WALLET_API"
  | "NOT_REGISTERED"
  | "INSUFFICIENT_PRIVATE_BALANCE"
  | "PRIVACY_CHECK_FAILED"
  | "INVALID_AMOUNT"
  | "RPC_UNAVAILABLE"
  | "PROOF_GENERATION_FAILED"
  | "UNKNOWN_WALLET_ERROR";

const PUBLIC_MESSAGES: Record<SafeErrorCode, string> = {
  CONFIGURATION_ERROR: "Public Starknet configuration is incomplete or unsafe.",
  WRONG_NETWORK: "Switch your wallet to Starknet Mainnet, then reconnect.",
  NO_ACCOUNT: "The wallet did not provide an account.",
  USER_REJECTED: "The wallet request was rejected. No transaction was sent.",
  UNSUPPORTED_WALLET_API: "This wallet does not expose Wallet API 0.10.3+ STRK20 actions.",
  NOT_REGISTERED: "This account is not activated for STRK20 private balances yet.",
  INSUFFICIENT_PRIVATE_BALANCE: "The shielded balance is not sufficient for this action.",
  PRIVACY_CHECK_FAILED: "The wallet stopped an action that could weaken privacy.",
  INVALID_AMOUNT: "Enter a valid amount within the displayed safety limit.",
  RPC_UNAVAILABLE: "The Starknet service is temporarily unavailable. Try again later.",
  PROOF_GENERATION_FAILED: "The wallet could not prepare the STRK20 proof.",
  UNKNOWN_WALLET_ERROR: "The wallet request did not complete. No sensitive details were retained.",
};

export class SafeWalletError extends Error {
  constructor(readonly code: SafeErrorCode, message = PUBLIC_MESSAGES[code]) {
    super(message);
    this.name = "SafeWalletError";
  }
}

type ErrorLike = { code?: unknown; message?: unknown; name?: unknown };

function classifyError(error: unknown): SafeErrorCode {
  if (error instanceof SafeWalletError) return error.code;

  const candidate = error && typeof error === "object" ? (error as ErrorLike) : {};
  const numericCode =
    typeof candidate.code === "number"
      ? candidate.code
      : typeof candidate.code === "string" && /^\d+$/.test(candidate.code)
        ? Number(candidate.code)
        : null;

  // Wallet API 0.10.3 error codes. Messages are deliberately discarded.
  if (numericCode === 113) return "USER_REJECTED";
  if (numericCode === 114) return "INVALID_AMOUNT";
  if (numericCode === 118) return "NOT_REGISTERED";
  if (numericCode === 119) return "INSUFFICIENT_PRIVATE_BALANCE";
  if (numericCode === 120) return "PRIVACY_CHECK_FAILED";
  if (numericCode === 162) return "UNSUPPORTED_WALLET_API";
  if (numericCode === 163) return "UNKNOWN_WALLET_ERROR";

  const text = [candidate.code, candidate.name, candidate.message]
    .filter((value): value is string | number =>
      typeof value === "string" || typeof value === "number",
    )
    .join(" ")
    .toLowerCase();

  if (text.includes("wrong_network") || text.includes("mainnetrequired")) return "WRONG_NETWORK";
  if (text.includes("invalid_amount") || text.includes("amountparse")) return "INVALID_AMOUNT";
  if (text.includes("not_registered") || text.includes("not registered")) return "NOT_REGISTERED";
  if (text.includes("insufficient_private_balance")) return "INSUFFICIENT_PRIVATE_BALANCE";
  if (text.includes("privacy_leak") || text.includes("privacy check")) return "PRIVACY_CHECK_FAILED";
  if (
    text.includes("api_version_not_supported") ||
    text.includes("unsupported_wallet") ||
    text.includes("unsupported wallet") ||
    text.includes("supportedwalletapi")
  ) return "UNSUPPORTED_WALLET_API";
  if (
    text.includes("user_refused") ||
    text.includes("user rejected") ||
    text.includes("rejected by user") ||
    text.includes("userrefused")
  ) return "USER_REJECTED";
  if (text.includes("no_account") || text.includes("no account")) return "NO_ACCOUNT";
  if (text.includes("proof") || text.includes("prover")) return "PROOF_GENERATION_FAILED";
  if (
    text.includes("rpc") ||
    text.includes("network request") ||
    text.includes("failed to fetch") ||
    text.includes("timeout")
  ) return "RPC_UNAVAILABLE";

  return "UNKNOWN_WALLET_ERROR";
}

export function toSafeWalletError(error: unknown): SafeWalletError {
  if (error instanceof SafeWalletError) return error;
  return new SafeWalletError(classifyError(error));
}

export type RedactedDiagnostic = {
  appVersion: "0.1.0";
  network: "SN_MAIN";
  walletApiSupported: boolean | null;
  stage: WalletStage;
  errorCode: SafeErrorCode;
  timestamp: string;
};

export function createRedactedDiagnostic(input: {
  error: unknown;
  stage: WalletStage;
  walletApiSupported: boolean | null;
  now?: Date;
}): RedactedDiagnostic {
  const safeError = toSafeWalletError(input.error);
  return {
    appVersion: "0.1.0",
    network: "SN_MAIN",
    walletApiSupported: input.walletApiSupported,
    stage: input.stage,
    errorCode: safeError.code,
    timestamp: (input.now ?? new Date()).toISOString(),
  };
}
