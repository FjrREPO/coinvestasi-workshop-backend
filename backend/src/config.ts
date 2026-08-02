// config.ts = satu tempat untuk semua konfigurasi & konstanta

// RPC publik bisa mati kapan saja → daftar fallback, .env dicoba pertama
export const RPC_URLS = [
  process.env.RPC_URL,
  "https://bsc-testnet.drpc.org",
  "https://97.rpc.thirdweb.com",
  "https://bsc-testnet-rpc.publicnode.com",
  "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
].filter(Boolean) as string[];

// Alamat deployment sesi 4 — salin dari broadcast/run-latest.json, jangan ketik manual
export const CONTRACTS = {
  rewardToken: "0x55387f2c4B849345e0Dc83e7F9085D8432FD3e36",
  bountyFactory: "0xd2ed4244eff2e07200c4c9e5dde99fe39516b7e1",
} as const;

export const DEPLOY_BLOCK = 121_396_976n; // block deploy factory, titik awal scan
export const CHUNK = 999n; // muat di semua RPC gratis (thirdweb: maks 1000 block per getLogs)
export const PORT = Number(process.env.PORT ?? 3000);
