# Backend 1 — Mini Indexer Papan Sayembara

> **Tujuan:** **API full** workshop (Hono :3000) + mini-indexer manual (viem + SQLite).  
> Alternatif indexing otomatis: `../ponder` (Ponder = **index only**, GraphQL debug di :42069 — bukan API workshop).

> Baca event historis (`getLogs`) + dengerin event baru (`watchEvent`), lalu sajikan via API Hono.

## Quick start

```bash
bun install

# jalanin server (auto backfill + watch + API)
bun dev

# test API
curl http://localhost:3000/board
curl http://localhost:3000/health
```

## API endpoints

| Method | Route               | Deskripsi                                                      |
| ------ | ------------------- | -------------------------------------------------------------- |
| GET    | `/board`            | Semua bounty + submission (siapa posting apa, siapa klaim apa) |
| GET    | `/bounty/:escrow`   | Detail satu bounty (live dari chain, 6 view = 1 multicall)     |
| GET    | `/wallet/:address`  | Bounty & submission milik wallet tsb                           |
| GET    | `/balance/:address` | Saldo RWD token                                                |
| GET    | `/pending`          | Antrean submission yang menunggu penilaian (dipakai agent AI)  |
| GET    | `/leaderboard`      | Peringkat worker: jumlah menang + total reward                 |
| POST   | `/verdicts`         | Agent lapor hasil + **alasan** AI (chain cuma simpan true/false) |
| GET    | `/verdicts/:escrow` | Riwayat penilaian AI satu bounty                               |
| GET    | `/health`           | Cek server nyala + status relayer                              |

### Endpoint tulis (relayer) — butuh `RELAYER_PK`

Backend yang tanda tangan & bayar gas, jadi peserta bisa bikin bounty tanpa `cast`. Tanpa `RELAYER_PK` route ini balas `503` dan sisa API tetap jalan.

| Method | Route                          | Body                                              |
| ------ | ------------------------------ | ------------------------------------------------- |
| POST   | `/relay/bounty`                | `{ reward: "5", rules_uri, deadline_jam?: 24 }`   |
| POST   | `/relay/bounty/:escrow/submit` | `{ proof_uri }`                                   |

```bash
curl -X POST http://localhost:3000/relay/bounty -H 'content-type: application/json' \
  -d '{"reward":"5","rules_uri":"https://contoh.com/RULES.md"}'
# → {"hash":"0x...","escrow":"0x...","bountyId":4}
```

> ⚠️ **Ini pola kustodian, bukan pola web3 yang benar.** Backend menyimpan private key, jadi siapa pun yang bisa memanggil API-mu bisa membelanjakan dana wallet itu — dan semua bounty tercatat atas nama satu alamat. Dipakai di sini murni biar demo workshop gampang. Pola produksinya: user tanda tangan sendiri dari wallet-nya (materi Sesi 7).

## Arsitektur

```text
              backfill historis (getLogs per 999 block)
BNB Testnet ◄─────────────────────────────────────────────┐
    │                                                      │
    │  checkpoint per chunk → mati di tengah tinggal lanjut│
    ▼                                                      │
indexer/ ──► SQLite (papan-sayembara.db) ◄────────────────┘
    │                                                      │
    │  watchEvent (realtime, terus nyala)                  │
    └──────────────────────────────────────────────────────┘
              │
              ▼
    Hono API :3000
    ├─ GET /board      → semua data indexed
    ├─ GET /bounty/:id → detail live dari chain
    └─ GET /wallet/:a  → aktivitas per wallet
              │
              ▼
        nanti: Frontend
```

## File-file penting

| File                      | Isi                                          |
| ------------------------- | -------------------------------------------- |
| `src/config.ts`           | Konfigurasi: RPC, alamat kontrak, konstanta  |
| `src/contracts.ts`        | ABI + event definitions + label status       |
| `src/lib/chain.ts`        | viem public client (fallback + rank)         |
| `src/lib/wallet.ts`       | wallet relayer — satu-satunya yang tanda tangan tx |
| `src/lib/db.ts`           | SQLite: skema, statement, query              |
| `src/indexer/handlers.ts` | Log chain → baris database                   |
| `src/indexer/backfill.ts` | Scan riwayat per chunk + checkpoint          |
| `src/indexer/watch.ts`    | Pantau event baru real-time                  |
| `src/services/bounty.ts`  | `readContract` + gabungan data on/off chain  |
| `src/services/relayer.ts` | `writeContract`: createBounty + submitWork   |
| `src/routes/api.ts`       | Endpoint REST (Hono)                         |
| `src/index.ts`            | Entry point: indexer + server                |

## Konsep inti (buat ngajar)

**`getLogs`** = minta node "kasih tau semua event X dari block A ke B".  
**`watchEvent`** = "tolong kabari kalau ada event X yang baru masuk".  
Keduanya pake HTTP RPC (public node) = gratis, tanpa WebSocket.

## Catatan untuk produksi

- **Checkpointing:** block terakhir disimpen di `sync_checkpoint` per chunk → aman untuk restart.
- **Reorg:** `INSERT OR IGNORE` + `ON CONFLICT` + `tx_hash UNIQUE` = idempotent; reorg kecil gak ngerusak.
- **Rate limit:** kode udah fallback + rank beberapa RPC dan retry per chunk; kalau masih ketat, isi `RPC_URL` di `.env` dengan API key (NodeReal/ZAN).
