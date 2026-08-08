# Agent Oracle (TypeScript) — Sesi 6

Juri AI Papan Sayembara: baca antrean dari backend (`GET /pending`), nilai proof vs rules pakai LLM, kirim `fulfillVerification(eligible)` on-chain, lalu lapor alasannya ke `POST /verdicts`.

Versi Python (Sesi 4, BNB Agent Studio) ada di `../../agent-oracle/` — ini penulisan ulang satu bahasa dengan backend (Bun + viem).

## Jalanin

```bash
bun install
cp .env.example .env   # isi AGENT_PK + LLM_API_KEY
bun main.ts
```

Backend Sesi 6 harus hidup dulu (`cd ../backend && bun dev`), dan wallet agent harus terdaftar sebagai oracle di factory (jalankan dari `SmartContract/` setelah `source .env`):

```bash
cast send 0x24df9c33d24d7c84e527d247d25a203490001be9 \
  "setOracle(address)" <ALAMAT_WALLET_AGENT> \
  --rpc-url https://bsc-testnet.drpc.org --private-key $WALLET_PK --legacy
```

## Struktur

| File | Fungsi |
| --- | --- |
| `chain.ts` | koneksi BSC Testnet, wallet agent, baca escrow (multicall), kirim verdict (tx legacy) |
| `judge.ts` | juri AI: system prompt, ambil rules+proof, JSON verdict `{eligible, alasan}` |
| `main.ts` | loop: `GET /pending` → verifikasi chain → nilai AI → tx → `POST /verdicts` |

## Catatan keamanan

- `AGENT_PK` cuma buat testnet — di produksi pakai keystore/KMS.
- Kontrak hanya menerima verdict dari alamat `factory.oracle()`; ganti oracle = `setOracle` oleh owner factory.
- Kalau agent mati, creator tetap bisa resolve manual setelah `submissionDeadline` (fallback di kontrak).
