// contracts.ts = ABI minimal + konstanta status escrow

import { parseAbi } from "viem";

export const factoryAbi = parseAbi(["function oracle() view returns (address)"]);

export const escrowAbi = parseAbi([
  "function status() view returns (uint8)",
  "function rulesURI() view returns (string)",
  "function proofURI() view returns (string)",
  "function worker() view returns (address)",
  "function fulfillVerification(bool eligible)",
]);

export const STATUS_DISUBMIT = 2; // enum: 0 MenungguDana, 1 Dibuka, 2 Disubmit, 3 Selesai, 4 Dibatalkan
