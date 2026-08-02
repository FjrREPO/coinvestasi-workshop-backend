// index.ts = entry point: 1) backfill → 2) watchEvent → 3) jalanin Hono API

import { Hono } from "hono";
import { cors } from "hono/cors";
import { backfill, watch } from "./indexer";
import { board, readEscrow, balanceOf } from "./service";
import { getBoard } from "./db";
import type { Address } from "viem";

// 1) Start indexer: backfill historis + watch event baru
await backfill();
watch();

// 2) Hono API = REST endpoint buat backend 2 (dan nanti frontend)
const app = new Hono();
app.use("/*", cors()); // bypass CORS biar frontend localhost bisa call API endpoint

// GET /board → siapa posting apa, siapa klaim apa (data indexed + live chain)
app.get("/board", async (c) => c.json(await board()));

// GET /bounty/:escrow → detail 1 bounty (live dari chain)
app.get("/bounty/:escrow", async (c) => c.json(await readEscrow(c.req.param("escrow") as Address)));

// GET /wallet/:address → data wallet: bounties yang dia buat, submissions, balance RWD
app.get("/wallet/:address", (c) => {
  const addr = c.req.param("address").toLowerCase();
  const { bounties, submissions } = getBoard();
  return c.json({
    bounties: bounties.filter(b => (b as any).creator.toLowerCase() === addr),
    submissions: submissions.filter(s => (s as any).worker.toLowerCase() === addr),
  });
});

// GET /balance/:address → saldo token RWD
app.get("/balance/:address", async (c) =>
  c.json({ balance: (await balanceOf(c.req.param("address") as Address)).toString() })
);

// GET /health → cek server nyala gak
app.get("/health", (c) => c.json({ ok: true, time: new Date().toISOString() }));

// 3) Jalankan server
const port = Number(process.env.PORT ?? 3000);
console.log(`🚀 API jalan di http://localhost:${port}/board`);
export default { port, fetch: app.fetch };
