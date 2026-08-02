// indexer.ts = jantung mini indexer
// 1) backfill: scan event historis via getLogs (DARI DEPLOY_BLOCK sampai sekarang)
// 2) watchEvent: dengerin event baru real-time
// 3) simpan semua ke SQLite (db.ts)

import type { Log } from "viem";
import { client, contracts, DEPLOY_BLOCK, bountyCreatedEvent, workSubmittedEvent, rewardReleasedEvent, workRejectedEvent } from "./chain";
import { db, getCheckpoint, setCheckpoint, upsertBounty, insertSubmission, markLatestSubmission } from "./db";
import type { Address } from "viem";

// Helper: retry sederhana kalau public RPC flaky (timeout / internal error)
const getLogsRetry = async <T>(fn: () => Promise<T>, retry = 3, delay = 1000): Promise<T> => {
  let err: any;
  for (let i = 0; i < retry; i++) {
    try { return await fn(); } catch (e) { err = e; if (i < retry - 1) await new Promise(r => setTimeout(r, delay * (i + 1))); }
  }
  throw err;
};

// Ganti semua client.getLogs(...) jadi getLogsRetry(() => client.getLogs(...))
// ---------------------------------------------------------------------------
// Proses 1 event log → tentukan jenisnya → simpan ke DB
const process = {
  bountyCreated: (log: Log<bigint, number, false, any, true>) => {
    const { bountyId, escrow, creator, rewardAmount } = (log as any).args;
    upsertBounty.run({
      bountyId: Number(bountyId), escrow, creator,
      rewardAmount: rewardAmount.toString(),
      txHash: log.transactionHash!, blockNumber: Number(log.blockNumber),
      ts: Math.floor(Date.now() / 1000),
    });
    console.log("📦 bounty created  #%s by %s", bountyId, creator);
  },

  workSubmitted: (log: Log<bigint, number, false, any, true>, escrow: string) => {
    const { worker, proofURI } = (log as any).args;
    insertSubmission.run({
      escrow, worker, proofUri: proofURI,
      txHash: log.transactionHash!, blockNumber: Number(log.blockNumber),
      ts: Math.floor(Date.now() / 1000),
    });
    console.log("📝 work submitted   %s → %s", worker, escrow);
  },

  rewardReleased: (log: Log<bigint, number, false, any, true>, escrow: string) => {
    const { rewardAmount } = (log as any).args;
    markLatestSubmission(escrow, "rewarded", (rewardAmount as bigint).toString());
    console.log("✅ reward released %s RWD → escrow %s", rewardAmount?.toString(), escrow);
  },

  workRejected: (log: Log<bigint, number, false, any, true>, escrow: string) => {
    markLatestSubmission(escrow, "rejected");
    console.log("❌ work rejected   escrow %s", escrow);
  },
};

// backfill: ambil semua event historis
// Gimana: getLogs = minta node RPC histori log dari block A ke B
export const backfill = async () => {
  const lastCheckpoint = getCheckpoint();
  const fromBlock = lastCheckpoint > DEPLOY_BLOCK ? lastCheckpoint + 1n : DEPLOY_BLOCK;
  const latest = await client.getBlockNumber();

  if (fromBlock > latest) return;

  console.log("🔄 backfill dari block %s → %s", fromBlock, latest);

  // Public RPC batesin eth_getLogs max 10k block per query (drpc gratis cutoff).
  // Solusi: chunk scan 8k block per call, aman buat semua public RPC.
  const CHUNK = 8000n;

  // 1) Factory events
  for (let from = fromBlock; from <= latest; from += CHUNK) {
    const to = from + CHUNK - 1n > latest ? latest : from + CHUNK - 1n;
    const factoryLogs = await getLogsRetry(() => client.getLogs({ address: contracts.bountyFactory, event: bountyCreatedEvent, fromBlock: from, toBlock: to }));
    for (const log of factoryLogs) process.bountyCreated(log);
  }

  // 2) Escrow events: scan events untuk smua escrow yang kita tau
  const escrows = (db.prepare("SELECT escrow FROM bounties").all() as { escrow: string }[]).map(r => r.escrow);
  for (const address of escrows) {
    for (let from = fromBlock; from <= latest; from += CHUNK) {
      const to = from + CHUNK - 1n > latest ? latest : from + CHUNK - 1n;
      const addr = address as Address;
      const logs = await getLogsRetry(() => client.getLogs({ address: addr, event: workSubmittedEvent, fromBlock: from, toBlock: to }));
      for (const log of logs) process.workSubmitted(log, address);
      const rls = await getLogsRetry(() => client.getLogs({ address: addr, event: rewardReleasedEvent, fromBlock: from, toBlock: to }));
      for (const log of rls) process.rewardReleased(log, address);
      const wrj = await getLogsRetry(() => client.getLogs({ address: addr, event: workRejectedEvent, fromBlock: from, toBlock: to }));
      for (const log of wrj) process.workRejected(log, address);
    }
  }

  setCheckpoint(latest);
  console.log("✅ backfill selesai | bounties: %d | submissions: %d",
    (db.prepare("SELECT COUNT(*) c FROM bounties").get() as any).c,
    (db.prepare("SELECT COUNT(*) c FROM submissions").get() as any).c,
  );
};

// watchEvent: real-time listener, tiap event baru langsung masuk proses
// ini yang dipakai live: backend gak perlu backfill kalau udah nyala terus
export const watch = () => {
  // 2) Escrow: tiap bounty baru kita add watcher-nya
  const watchEscrow = (address: string) => {
    const opts = { address, strict: false };
    (client as any).watchEvent({ ...opts, event: workSubmittedEvent, onLogs: (l: Log[]) => l.forEach(log => process.workSubmitted(log as any, address)) });
    (client as any).watchEvent({ ...opts, event: rewardReleasedEvent, onLogs: (l: Log[]) => l.forEach(log => process.rewardReleased(log as any, address)) });
    (client as any).watchEvent({ ...opts, event: workRejectedEvent, onLogs: (l: Log[]) => l.forEach(log => process.workRejected(log as any, address)) });
  };

  // watch escrow yang udah ada
  (db.prepare("SELECT escrow FROM bounties").all() as { escrow: string }[]).forEach(r => watchEscrow(r.escrow));

  // 1) Factory — kalau ada bounty baru, simpan + langsung start watch escrow-nya
  (client as any).watchEvent({
    address: contracts.bountyFactory,
    event: bountyCreatedEvent,
    onLogs: (logs: Log[]) => logs.forEach(log => {
      process.bountyCreated(log as any);
      watchEscrow((log as any).args.escrow);
    }),
  });

  console.log("👀 watchEvent jalan: factory + semua escrow");
};
