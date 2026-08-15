import type { STRK20_ACTION } from "@starknet-io/types-js";
import { num, validateAndParseAddress } from "starknet";

import { SafeWalletError } from "@/lib/strk20/errors";

export function privateTransferAction(input: {
  tokenAddress: `0x${string}`;
  recipient: string;
  amount: bigint;
}): STRK20_ACTION {
  if (input.amount <= 0n) throw new SafeWalletError("INVALID_AMOUNT");

  let recipient: string;
  try {
    recipient = validateAndParseAddress(input.recipient.trim());
  } catch {
    throw new SafeWalletError("INVALID_RECIPIENT");
  }

  if (BigInt(recipient) === 0n) {
    throw new SafeWalletError("INVALID_RECIPIENT");
  }

  return {
    type: "transfer",
    token: input.tokenAddress,
    amount: num.toHex(input.amount),
    recipient,
  };
}
