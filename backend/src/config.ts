// config.ts = satu tempat untuk semua konfigurasi & konstanta

// RPC publik bisa mati kapan saja → daftar fallback, .env dicoba pertama.
// thirdweb sengaja TIDAK dipakai: getLogs-nya balikin [] kosong tanpa error (data hilang diam-diam).
export const RPC_URLS = [
  process.env.RPC_URL,
  "https://bnb-testnet.api.onfinality.io/public",
  "https://bsc-testnet-rpc.publicnode.com",
  "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
].filter(Boolean) as string[];

// Alamat deployment workshop — salin dari broadcast/run-latest.json, jangan ketik manual
export const CONTRACTS = {
  rewardToken: "0xcbecebe30173e5e93f6e2a045473fade1b473e3b",
  bountyFactory: "0x24df9c33d24d7c84e527d247d25a203490001be9",
} as const;

export const DEPLOY_BLOCK = 122_732_476n; // block deploy factory, titik awal scan
export const CHUNK = 9000n; // drpc gratis: maks 10k block per getLogs
export const PORT = Number(process.env.PORT ?? 3000);
