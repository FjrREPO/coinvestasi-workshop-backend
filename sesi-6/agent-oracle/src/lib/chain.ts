// lib/chain.ts = koneksi BSC Testnet + wallet agent

import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bscTestnet } from "viem/chains";
import { AGENT_PK, RPC_URL } from "../config";

const rpc = http(RPC_URL);

export const publicClient = createPublicClient({ chain: bscTestnet, transport: rpc });

export const account = privateKeyToAccount(AGENT_PK);
export const walletClient = createWalletClient({ account, chain: bscTestnet, transport: rpc });
