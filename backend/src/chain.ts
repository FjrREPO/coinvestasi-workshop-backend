// chain.ts = koneksi ke BNB Testnet via HTTP RPC (pooling)
// Kita baca data dari block chain: function call (view) + event log

import { createPublicClient, http, parseAbiItem } from "viem";

// Chain config (BNB Smart Chain Testnet)
// chainId 97 | RPC public gratis | gak ada rpc di viem/bsc, jadi override http
export const chain = {
  id: 97,
  name: "BNB Testnet",
  nativeCurrency: { name: "BNB", symbol: "tBNB", decimals: 18 },
  rpcUrls: { default: { http: [process.env.RPC_URL ?? "https://bsc-testnet.drpc.org"] } },
} as const;

// Alamat kontrak yang deploy di sesi 4 (cek folder SmartContract/broadcast/)
export const contracts = {
  rewardToken: "0x55387f2c4B849345e0Dc83e7F9085D8432FD3e36",
  bountyFactory: "0xd2ed4244Eff2e07200C4C9E5DDa99fe39516B7e1",
} as const;

// Block saat factory di-deploy (supaya indexer scan dari sini, bukan dari 0)
export const DEPLOY_BLOCK = 121_683_696n; // 0x73c5ef0

// Public client = read-only client (getLogs, readContract, watchEvent)
export const client = createPublicClient({ chain, transport: http() });

// Event signature yang kita track (dipake buat getLogs / watchEvent)
export const bountyCreatedEvent = parseAbiItem(
  "event BountyCreated(uint256 indexed bountyId, address indexed escrow, address indexed creator, uint256 rewardAmount)"
);
export const workSubmittedEvent = parseAbiItem(
  "event WorkSubmitted(address indexed worker, string proofURI)"
);
export const rewardReleasedEvent = parseAbiItem(
  "event RewardReleased(address indexed worker, uint256 rewardAmount)"
);
export const workRejectedEvent = parseAbiItem(
  "event WorkRejected(address indexed worker)"
);
