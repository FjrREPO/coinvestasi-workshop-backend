// config.ts = satu tempat untuk semua konfigurasi & konstanta

export const RPC_URL = process.env.RPC_URL ?? "https://bsc-testnet.drpc.org";

// Alamat deployment workshop — samakan dengan backend/src/config.ts
export const FACTORY = "0x24df9c33d24d7c84e527d247d25a203490001be9" as const;

// Wallet agent (testnet only — mainnet pakai keystore/KMS)
if (!process.env.AGENT_PK) throw new Error("AGENT_PK belum diisi — cp .env.example .env lalu lengkapi");
export const AGENT_PK = process.env.AGENT_PK as `0x${string}`;

// LLM: endpoint OpenAI-compatible (OpenRouter / OpenAI / dll)
export const LLM = {
  baseUrl: (process.env.LLM_BASE_URL ?? "https://openrouter.ai/api/v1").replace(/\/$/, ""),
  apiKey: process.env.LLM_API_KEY,
  model: process.env.LLM_MODEL ?? "anthropic/claude-sonnet-4.5",
} as const;

export const BACKEND_API_URL = process.env.BACKEND_API_URL ?? "http://localhost:3000";
export const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_SECONDS ?? 15) * 1000;
