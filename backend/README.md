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
| GET    | `/bounty/:escrow`   | Detail satu bounty (live dari chain)                           |
| GET    | `/wallet/:address`  | Bounty &amp; submission milik wallet tsb                       |
| GET    | `/balance/:address` | Saldo RWD token                                                |
| GET    | `/health`           | Cek server nyala                                               |


## Arsitektur

```markdown
              backfill historis (getLogs per 8k block)
BNB Testnet ◄─────────────────────────────────────────────┐
    │                                                      │
    │  backfill selesai → simpen checkpoint terakhir       │
    ▼                                                      │
indexer.ts ──► SQLite (papan-sayembara.db) ◄──────────────┘
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


| File             | Isi                                          |
| ---------------- | -------------------------------------------- |
| `src/chain.ts`   | Koneksi RPC, alamat kontrak, event signature |
| `src/abi.ts`     | ABI minimal yang kita butuh                  |
| `src/db.ts`      | Skema SQLite + helper query                  |
| `src/indexer.ts` | `backfill()` + `watch()` — jantung indexer   |
| `src/service.ts` | `readContract` baca state + business logic   |
| `src/index.ts`   | Start indexer + Hono routes                  |


## Konsep inti (buat ngajar)

`**getLogs**` = minta node "kasih tau semua event X dari block A ke B".  
`**watchEvent**` = "tolong kabari kalau ada event X yang baru masuk".  
Keduanya pake HTTP RPC (public node) = gratis, tanpa WebSocket.

## Catatan untuk produksi

- **Checkpointing:** kita simpen block terakhir di `sync_checkpoint` → aman untuk restart.
- **Reorg:** `INSERT OR IGNORE` + `ON CONFLICT` = idempotent; reorg kecil gak ngerusak.
- **Rate limit:** kalau kena spam dari public RPC, tambah `batch` atau ganti RPC paid.

