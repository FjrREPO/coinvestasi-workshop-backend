# Agent Oracle (TypeScript) — Sesi 6

Juri AI Papan Sayembara: baca antrean dari backend (`GET /pending`), nilai proof vs rules pakai LLM, kirim `fulfillVerification(eligible)` on-chain, lalu lapor alasannya ke `POST /verdicts`.

Versi Python (Sesi 4, BNB Agent Studio) ada di `../../agent-oracle/` — ini penulisan ulang satu bahasa dengan backend (Bun + viem), dengan struktur folder yang sama persis dengan `../backend`.

## Jalanin

```bash
bun install
cp .env.example .env   # isi AGENT_PK + LLM_API_KEY
bun dev
```

Backend Sesi 6 harus hidup dulu (`cd ../backend && bun dev`), dan wallet agent harus terdaftar sebagai oracle di factory (jalankan dari `SmartContract/` setelah `source .env`):

```bash
cast send 0x24df9c33d24d7c84e527d247d25a203490001be9 \
  "setOracle(address)" <ALAMAT_WALLET_AGENT> \
  --rpc-url https://bsc-testnet.drpc.org --private-key $WALLET_PK --legacy
```

## Struktur (sama dengan backend)

```
src/
├── config.ts                 # env + konstanta (factory, LLM, interval)
├── contracts.ts              # ABI minimal + STATUS_DISUBMIT
├── lib/
│   └── chain.ts              # publicClient + wallet agent
├── services/
│   ├── oracle.ts             # baca escrow (multicall) + kirim verdict (tx legacy)
│   ├── judge.ts              # juri AI: prompt, ambil rules+proof, JSON verdict
│   └── api.ts                # klien API backend: GET /pending + POST /verdicts
└── index.ts                  # loop utama
```

## Catatan keamanan

- `AGENT_PK` cuma buat testnet — di produksi pakai keystore/KMS.
- Kontrak hanya menerima verdict dari alamat `factory.oracle()`; ganti oracle = `setOracle` oleh owner factory.
- Kalau agent mati, creator tetap bisa resolve manual setelah `submissionDeadline` (fallback di kontrak).
