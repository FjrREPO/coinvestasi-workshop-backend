// service.ts = business logic: readContract (baca state) + gabungin data on/off chain

import { client, contracts } from "./chain";
import { bountyFactoryAbi, bountyEscrowAbi, rewardTokenAbi, statusLabel } from "./abi";
import { getBoard } from "./db";
import type { Address } from "viem";

// readContract = cara baca function 'view' di kontrak (gratis, tanpa gas)

// Contoh: berapa total bounty yang pernah di-post?
export const totalBounties = () =>
  client.readContract({ address: contracts.bountyFactory, abi: bountyFactoryAbi, functionName: "totalBounties" });

// Baca detail escrow (status, creator, reward, rules, worker, proof) langsung dari chain
export const readEscrow = async (escrow: Address) => ({
  status: statusLabel[await client.readContract({ address: escrow, abi: bountyEscrowAbi, functionName: "status" }) as number],
  creator: await client.readContract({ address: escrow, abi: bountyEscrowAbi, functionName: "creator" }),
  rewardAmount: (await client.readContract({ address: escrow, abi: bountyEscrowAbi, functionName: "rewardAmount" })).toString(),
  rulesURI: await client.readContract({ address: escrow, abi: bountyEscrowAbi, functionName: "rulesURI" }),
  worker: await client.readContract({ address: escrow, abi: bountyEscrowAbi, functionName: "worker" }),
  proofURI: await client.readContract({ address: escrow, abi: bountyEscrowAbi, functionName: "proofURI" }),
});

// Gabungan: data historis (SQLite) + state live (chain)
export const board = async () => {
  const { bounties, submissions } = getBoard();
  return {
    total: Number(await totalBounties()),
    bounties,          // siapa posting apa (indexed dari event)
    submissions,       // siapa klaim/submit apa (indexed dari event)
    // cara tambahin live status per bounty:
    // const live = await Promise.all(bounties.map(b => readEscrow(b.escrow as Address)));
  };
};

// Bonus: cek saldo RWD di wallet siapapun
export const balanceOf = (addr: Address) =>
  client.readContract({ address: contracts.rewardToken, abi: rewardTokenAbi, functionName: "balanceOf", args: [addr] });
