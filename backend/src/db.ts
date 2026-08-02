// db.ts = SQLite (better-sqlite3), file disimpan lokal di papan-sayembara.db
// 3 tabel: bounties (creator buat apa), submissions (siapa submit apa),
//          checkpoint = inget block terakhir yang kita proses (biar gak dobel)

import { Database } from "bun:sqlite";

export const db = new Database("papan-sayembara.db", { create: true });

db.exec("PRAGMA journal_mode = WAL;");

db.exec(`
  CREATE TABLE IF NOT EXISTS bounties (
    bounty_id    INTEGER PRIMARY KEY,
    escrow       TEXT UNIQUE NOT NULL,
    creator      TEXT NOT NULL,
    reward_amount TEXT NOT NULL,
    tx_hash      TEXT NOT NULL,
    block_number INTEGER NOT NULL,
    created_at   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    escrow        TEXT NOT NULL,
    worker        TEXT NOT NULL,
    proof_uri     TEXT NOT NULL,
    status        TEXT NOT NULL, -- 'submitted' | 'rewarded' | 'rejected'
    reward_amount TEXT,
    tx_hash       TEXT NOT NULL,
    block_number  INTEGER NOT NULL,
    created_at    INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_submissions_escrow ON submissions(escrow);
  CREATE INDEX IF NOT EXISTS idx_submissions_worker ON submissions(worker);

  CREATE TABLE IF NOT EXISTS sync_checkpoint (
    id          INTEGER PRIMARY KEY CHECK (id = 1),
    last_block  INTEGER NOT NULL
  );
`);

// Helper baca/tulis DB (jangan dipanggil langsung di handler, import di service)

// Cek block terakhir yang udah kita proses (buat backfill)
export const getCheckpoint = (): bigint => {
  const row = db.prepare("SELECT last_block FROM sync_checkpoint WHERE id = 1").get() as { last_block: number } | undefined;
  return BigInt(row?.last_block ?? 0);
};

// Simpan block terakhir setelah selesai backfill/watch
export const setCheckpoint = (block: bigint) =>
  db.prepare("INSERT INTO sync_checkpoint (id, last_block) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET last_block = ?")
    .run(Number(block), Number(block));

// Insert/update bounty (INSERT OR IGNORE supaya reorg aman)
export const upsertBounty = db.prepare(`
  INSERT INTO bounties (bounty_id, escrow, creator, reward_amount, tx_hash, block_number, created_at)
  VALUES (@bountyId, @escrow, @creator, @rewardAmount, @txHash, @blockNumber, @ts)
  ON CONFLICT(bounty_id) DO NOTHING
`);

// Insert submission baru
export const insertSubmission = db.prepare(`
  INSERT INTO submissions (escrow, worker, proof_uri, status, tx_hash, block_number, created_at)
  VALUES (@escrow, @worker, @proofUri, 'submitted', @txHash, @blockNumber, @ts)
`);

// Update status terakhir submission di escrow tertentu
export const markLatestSubmission = (escrow: string, status: string, rewardAmount?: string) =>
  db.transaction(() => {
    const row = db.prepare(
      "SELECT id FROM submissions WHERE escrow = ? ORDER BY id DESC LIMIT 1"
    ).get(escrow) as { id: number } | undefined;
    if (!row) return;
    db.prepare("UPDATE submissions SET status = ?, reward_amount = ? WHERE id = ?")
      .run(status, rewardAmount ?? null, row.id);
  })();

// Query buat API: siapa posting apa + siapa submit apa
export const getBoard = () => ({
  bounties: db.prepare("SELECT * FROM bounties ORDER BY block_number DESC").all(),
  submissions: db.prepare("SELECT * FROM submissions ORDER BY block_number DESC").all(),
});
