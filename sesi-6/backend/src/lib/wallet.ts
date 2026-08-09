// lib/wallet.ts = wallet relayer: satu-satunya bagian backend yang bisa TANDA TANGAN transaksi

import { createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bscTestnet } from "viem/chains";
import { RELAYER_PK } from "../config";
import { transport } from "./chain";

// null = RELAYER_PK belum diisi → endpoint tulis balas 503, endpoint baca tetap hidup
export const relayerWallet = RELAYER_PK
  ? createWalletClient({ account: privateKeyToAccount(RELAYER_PK), chain: bscTestnet, transport })
  : null;
