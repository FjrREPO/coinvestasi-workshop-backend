# Setup Ponder — Indexer Papan Sayembara

Ponder di folder ini = **indexer only** (event onchain → DB).  

```markdown
BNB Testnet ──► ponder/ (index + PGlite) ──debug──► :42069 GraphQL
                      │
                      └── (Backend 2 opsional query Ponder)
frontend / peserta ──► backend/ :3000  (REST full)
```

---

## Prasyarat

- Bun atau Node ≥ 22
- RPC BNB Testnet stabil (Ankr / Nodereal / Alchemy — public free sering rate-limit)

Factory **live** di config:


|            |                                              |
| ---------- | -------------------------------------------- |
| address    | `0x836B8005De6dF1e3A8908B0eeefd5f3B41E5D3Cc` (sesuaikan dengan smart contract address kamu) |
| startBlock | `121388400` (sesuaikan dengan block smart contract kamu dideploy)                                  |

Cek:

```bash
cast code 0x836B8005De6dF1e3A8908B0eeefd5f3B41E5D3Cc --rpc-url $RPC | head -c 20
# harus bytecode, bukan 0x
```

---

## 1. Scaffold

```bash
# dari root repo workshop
bunx create-ponder ponder
```

---

## 2. Install + env

```bash
cd ponder
bun install

cp .env.example .env.local
```

Isi `.env.local`:

```bash
# convention create-ponder: PONDER_RPC_URL_<chainId>
PONDER_RPC_URL_97=https://rpc.ankr.com/bsc_testnet_chapel/<YOUR_KEY>

# kosong = PGlite (zero setup). Isi kalau mau Postgres.
DATABASE_URL=
```

`.env.local` gitignored — jangan commit key.

---

## 3. File yang penting

```
ponder/
├── ponder.config.ts       # chain 97, factory, factory() child, startBlock
├── ponder.schema.ts       # tabel bounty + submission
├── abis/
│   ├── BountyFactoryAbi.ts
│   └── BountyEscrowAbi.ts
├── src/
│   ├── index.ts           # handler event → insert/update DB
│   └── api/index.ts       # minimal GraphQL/SQL (wajib ada biar build lolos)
├── .env.local
└── .ponder/pglite/        # DB auto (jangan commit)
```


| File               | Fungsi                                                |
| ------------------ | ----------------------------------------------------- |
| `ponder.config.ts` | *apa* yang di-index + dari block berapa               |
| `ponder.schema.ts` | *bentuk* row di DB                                    |
| `src/index.ts`     | *cara* event jadi row                                 |
| `src/api/index.ts` | cuma biar `ponder dev` jalan — **bukan** API workshop |


---

## 4. Jalankan indexing

```bash
bun run dev
```

Log sukses:

```
Connected to database type=pglite ...
Connected to JSON-RPC chain=bscTestnet hostnames=["rpc.ankr.com"]
Created database tables count=2 tables=["bounty","submission"]
Created HTTP server port=42069
Started backfill indexing chain=bscTestnet block_range=[121388400, ...]
```

Yang terjadi:

1. Backfill `getLogs` dari `startBlock` → tip (chunk otomatis)
2. Handler di `src/index.ts` jalan per event
3. Setelah catch-up → follow head (live)
4. Port **42069** = debug GraphQL saja

---

## 5. Cek indexing (debug)

Browser: [http://localhost:42069/graphql](http://localhost:42069/graphql)

```graphql
query {
  bountys {
    items { id bountyId creator rewardAmount }
    totalCount
  }
  submissions {
    items { id worker proofUri status }
    totalCount
  }
}
```

`totalCount: 0` setelah progress 100% = belum ada event onchain (`totalBounties()==0`). Normal — create bounty dulu (step 7).

DB file: `.ponder/pglite/` (Ponder 0.17 **tidak** punya `kind: "sqlite"`; PGlite = zero-setup-nya).

---

## 6. Event → tabel


| Event                         | Handler       | DB                              |
| ----------------------------- | ------------- | ------------------------------- |
| `BountyFactory:BountyCreated` | insert        | `bounty`                        |
| `BountyEscrow:WorkSubmitted`  | insert/update | `submission` status=`submitted` |
| `BountyEscrow:RewardReleased` | update        | status=`rewarded`               |
| `BountyEscrow:WorkRejected`   | update        | status=`rejected`               |


Child escrow di-discover lewat `factory()` di config (parameter event `escrow`).

---

## 7. Bikin data onchain (biar ada yang di-index)

```bash
cd ../SmartContract
# BOUNTY_FACTORY=0x836B8005De6dF1e3A8908B0eeefd5f3B41E5D3Cc
forge script script/CreateBounty.s.sol:CreateBounty \
  --rpc-url $PONDER_RPC_URL_97 --broadcast --legacy -vvvv
```

Terminal `ponder dev` harus muncul:

```
📦 bounty #0 by 0x... → 0xEscrow...
```

Submit:

```bash
cast send <ESCROW> "submitWork(string)" "https://example.com/proof.md" \
  --rpc-url $PONDER_RPC_URL_97 --private-key $PRIVATE_KEY --legacy
```

→ `📝 submit ...` + row di GraphiQL.

---

## 8. Troubleshooting


| Gejala                                  | Fix                                                  |
| --------------------------------------- | ---------------------------------------------------- |
| `PONDER_RPC_URL_97` missing / RPC error | Isi `.env.local`, ganti provider                     |
| `eth_getCode` = `0x` di factory         | Address salah                     |
| Backfill stuck 0% lama                  | RPC rate-limit / range besar, tunggu atau ganti RPC |
| 100% tapi `totalCount: 0`               | Belum ada `BountyCreated` → step 7                   |
| `API endpoint file not found`           | Jangan hapus `src/api/index.ts`                      |
| Mau REST `/board`                       | Itu `**../backend**`, bukan Ponder                   |


---

## 9. Checklist

- [ ] `bun install`
- [ ] `.env.local` → `PONDER_RPC_URL_97=...`
- [ ] `bun run dev` → Connected DB + RPC, tables created, backfill start
- [ ] (opsional) GraphiQL :42069
- [ ] createBounty → log `📦` + row di query
- [ ] API workshop: `cd ../backend && bun dev`

---

## Reference (docs resmi Ponder)

- [Get started](https://ponder.sh/docs/get-started) — create-ponder, `dev`, GraphQL
- [Factory pattern](https://ponder.sh/docs/guides/factory) — `factory()`
- [Schema / tables](https://ponder.sh/docs/schema/tables)
- [Indexing write](https://ponder.sh/docs/indexing/write) — `insert` / `onConflictDoUpdate`
- [Database](https://ponder.sh/docs/database) — PGlite vs Postgres
- [create-ponder CLI](https://ponder.sh/docs/api-reference/create-ponder)
- [Config](https://ponder.sh/docs/api-reference/ponder/config)

