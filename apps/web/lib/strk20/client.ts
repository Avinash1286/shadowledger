import type { WalletWithStarknetFeatures } from "@starknet-io/get-starknet-wallet-standard/features";
import type { STRK20_ACTION } from "@starknet-io/types-js";
import { num, RpcProvider, WalletAccountV6, walletV6 } from "starknet";

import type { PublicConfig } from "@/lib/config";
import { addressesEqual } from "@/lib/strk20/address";
import {
  type WalletCapability,
  detectWalletCapability,
} from "@/lib/strk20/capabilities";
import { SafeWalletError } from "@/lib/strk20/errors";
import { assertMainnetChain, SN_MAIN } from "@/lib/strk20/mainnet";

export type PrivacyWalletSession = {
  wallet: WalletWithStarknetFeatures;
  provider: RpcProvider;
  account: WalletAccountV6 | null;
  address: string;
  chainId: typeof SN_MAIN;
  walletName: string;
  capability: WalletCapability;
};

export async function connectPrivacyWallet(
  wallet: WalletWithStarknetFeatures,
  config: PublicConfig,
): Promise<PrivacyWalletSession> {
  const connection = await walletV6.standardConnect(wallet, false);
  const address = connection.accounts[0]?.address;
  if (!address) throw new SafeWalletError("NO_ACCOUNT");

  // This guard deliberately happens before WalletAccountV6 is constructed.
  const walletChainId = await walletV6.requestChainId(wallet);
  assertMainnetChain(walletChainId);
  assertMainnetChain(config.chainId);

  const provider = new RpcProvider({ nodeUrl: config.rpcUrl });
  const providerChainId = await provider.getChainId();
  assertMainnetChain(providerChainId);

  const capability = await detectWalletCapability(wallet);
  if (!capability.supported) {
    return {
      wallet,
      provider,
      account: null,
      address,
      chainId: SN_MAIN,
      walletName: wallet.name,
      capability,
    };
  }

  const account = new WalletAccountV6({
    provider,
    walletProvider: wallet,
    address,
  });

  return {
    wallet,
    provider,
    account,
    address,
    chainId: SN_MAIN,
    walletName: wallet.name,
    capability,
  };
}

async function assertSessionIsStillOnMainnet(
  session: PrivacyWalletSession,
): Promise<WalletAccountV6> {
  // Re-check through the raw wallet API before every WalletAccountV6 operation.
  const [currentWalletChainId, currentProviderChainId] = await Promise.all([
    walletV6.requestChainId(session.wallet),
    session.provider.getChainId(),
  ]);
  assertMainnetChain(currentWalletChainId);
  assertMainnetChain(currentProviderChainId);
  if (!session.account || !session.capability.supported) {
    throw new SafeWalletError("UNSUPPORTED_WALLET_API");
  }
  return session.account;
}

export async function readShieldedBalance(
  session: PrivacyWalletSession,
  tokenAddress: `0x${string}`,
): Promise<bigint> {
  const account = await assertSessionIsStillOnMainnet(session);
  const balances = await account.strk20Balances([tokenAddress]);
  const entry = balances.find((balance) => addressesEqual(balance.token, tokenAddress));
  return entry ? BigInt(entry.balance) : 0n;
}

function depositAction(token: `0x${string}`, amount: bigint): STRK20_ACTION {
  return {
    type: "deposit",
    token,
    amount: num.toHex(amount),
  };
}

export async function simulateShield(input: {
  session: PrivacyWalletSession;
  tokenAddress: `0x${string}`;
  amount: bigint;
}): Promise<void> {
  const account = await assertSessionIsStillOnMainnet(input.session);
  await account.strk20PrepareInvoke(
    [depositAction(input.tokenAddress, input.amount)],
    true,
  );
}

export async function submitShield(input: {
  session: PrivacyWalletSession;
  tokenAddress: `0x${string}`;
  amount: bigint;
}): Promise<string> {
  const action = depositAction(input.tokenAddress, input.amount);
  const account = await assertSessionIsStillOnMainnet(input.session);

  // Simulation is repeated immediately before submission; prior previews are not trusted.
  await account.strk20PrepareInvoke([action], true);
  const accountAfterFinalChainCheck = await assertSessionIsStillOnMainnet(input.session);
  const result = await accountAfterFinalChainCheck.strk20InvokeTransaction([action]);
  if (!result.transaction_hash) throw new SafeWalletError("UNKNOWN_WALLET_ERROR");
  return result.transaction_hash;
}

export async function disconnectPrivacyWallet(
  session: PrivacyWalletSession,
): Promise<void> {
  session.account?.unsubscribeChange();
  await session.wallet.features["standard:disconnect"].disconnect();
}
