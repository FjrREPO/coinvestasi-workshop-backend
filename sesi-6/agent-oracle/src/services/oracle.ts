// services/oracle.ts = aksi on-chain si agent: baca escrow + kirim verdict

import type { Address } from "viem";
import { FACTORY } from "../config";
import { escrowAbi, factoryAbi } from "../contracts";
import { publicClient, walletClient } from "../lib/chain";

// Alamat oracle yang terdaftar di factory (dicek saat startup)
export const oracleOnchain = () =>
  publicClient.readContract({ address: FACTORY, abi: factoryAbi, functionName: "oracle" });

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
