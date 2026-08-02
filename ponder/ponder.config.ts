import { parseAbiItem } from "abitype";
import { createConfig, factory } from "ponder";

import { BountyEscrowAbi } from "./abis/BountyEscrowAbi";
import { BountyFactoryAbi } from "./abis/BountyFactoryAbi";

// Event yang di-emit factory saat createBounty (parameter "escrow" = alamat child)
const bountyCreatedEvent = parseAbiItem(
  "event BountyCreated(uint256 indexed bountyId, address indexed escrow, address indexed creator, uint256 rewardAmount)",
);

// Factory yang MASIH live di BNB testnet (eth_getCode != 0x)
// Catatan: broadcast run-latest 0xd2ed... code-nya kosong di chain sekarang.
const FACTORY = "0x836B8005De6dF1e3A8908B0eeefd5f3B41E5D3Cc" as const;
const START_BLOCK = 121_388_400; // 0x73c3d70

export default createConfig({
  chains: {
    bscTestnet: {
      id: 97,
      // create-ponder convention: PONDER_RPC_URL_<chainId>
      rpc: process.env.PONDER_RPC_URL_97,
    },
  },
  contracts: {
    // Index factory sendiri (event BountyCreated)
    BountyFactory: {
      chain: "bscTestnet",
      abi: BountyFactoryAbi,
      address: FACTORY,
      startBlock: START_BLOCK,
    },
    // Index SEMUA escrow yang di-spawn factory (factory pattern)
    BountyEscrow: {
      chain: "bscTestnet",
      abi: BountyEscrowAbi,
      address: factory({
        address: FACTORY,
        event: bountyCreatedEvent,
        parameter: "escrow",
      }),
      startBlock: START_BLOCK,
    },
  },
});
