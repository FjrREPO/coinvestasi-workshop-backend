// chain.ts = koneksi BSC Testnet + wallet agent + helper kontrak

import { createPublicClient, createWalletClient, http, parseAbi, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bscTestnet } from "viem/chains";

export const FACTORY = "0x24df9c33d24d7c84e527d247d25a203490001be9" as const;
export const STATUS_DISUBMIT = 2; // enum: 0 MenungguDana, 1 Dibuka, 2 Disubmit, 3 Selesai, 4 Dibatalkan

export const factoryAbi = parseAbi(["function oracle() view returns (address)"]);
export const escrowAbi = parseAbi([
  "function status() view returns (uint8)",
  "function rulesURI() view returns (string)",
  "function proofURI() view returns (string)",
  "function worker() view returns (address)",
  "function fulfillVerification(bool eligible)",
]);

const rpc = http(process.env.RPC_URL ?? "https://bsc-testnet.drpc.org");
export const publicClient = createPublicClient({ chain: bscTestnet, transport: rpc });

export const account = privateKeyToAccount(process.env.AGENT_PK as `0x${string}`);
const walletClient = createWalletClient({ account, chain: bscTestnet, transport: rpc });

// 4 view escrow dalam SATU request (multicall — kebiasaan baik dari Sesi 5)
export const readEscrow = async (escrow: Address) => {
  const c = { address: escrow, abi: escrowAbi } as const;
  const [status, rulesURI, proofURI, worker] = await publicClient.multicall({
    contracts: [
      { ...c, functionName: "status" },
      { ...c, functionName: "rulesURI" },
      { ...c, functionName: "proofURI" },
      { ...c, functionName: "worker" },
    ],
    allowFailure: false,
  });
  return { status, rulesURI, proofURI, worker };
};

// Kirim verdict on-chain. gasPrice eksplisit = tx legacy (BSC testnet menolak EIP-1559)
export const sendVerdict = async (escrow: Address, eligible: boolean) => {
  const hash = await walletClient.writeContract({
    address: escrow, abi: escrowAbi, functionName: "fulfillVerification",
    args: [eligible], gasPrice: await publicClient.getGasPrice(),
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { hash, sukses: receipt.status === "success" };
};
