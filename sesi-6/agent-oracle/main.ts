// main.ts = loop agent: GET /pending -> verifikasi chain -> nilai AI -> tx -> lapor

import { getAddress } from "viem";
import { FACTORY, STATUS_DISUBMIT, account, factoryAbi, publicClient, readEscrow, sendVerdict } from "./chain";
import { judgeSubmission } from "./judge";

const API_URL = process.env.BACKEND_API_URL ?? "http://localhost:3000";
const INTERVAL = Number(process.env.POLL_INTERVAL_SECONDS ?? 15) * 1000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Simpan alasan AI ke backend — chain cuma tahu true/false
const laporVerdict = async (escrow: string, worker: string, eligible: boolean, alasan: string, txHash: string) => {
  try {
    const res = await fetch(`${API_URL}/verdicts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ escrow, worker, eligible, alasan, tx_hash: txHash }),
    });
    if (!res.ok) throw new Error(String(res.status));
  } catch (e) {
    console.log(`  gagal lapor verdict ke backend (lanjut): ${e}`);
  }
};

const oracle = await publicClient.readContract({ address: FACTORY, abi: factoryAbi, functionName: "oracle" });
console.log(`Agent wallet   : ${account.address}`);
console.log(`Oracle on-chain: ${oracle}`);
if (oracle.toLowerCase() !== account.address.toLowerCase())
  console.log("PERINGATAN: wallet agent BUKAN oracle di factory. Tx bakal revert BukanOracle.");

const sudahDinilai = new Set<string>(); // "escrow:proofURI" yang sudah diproses

console.log(`Antrean dari ${API_URL}/pending, polling tiap ${INTERVAL / 1000} detik. Ctrl+C buat berhenti.`);
while (true) {
  try {
    // 1 request HTTP menggantikan 1 + N*2 readContract ke RPC
    const { pending } = (await (await fetch(`${API_URL}/pending`)).json()) as
      { pending: { escrow: string; proof_uri: string }[] };
    for (const item of pending) {
      const escrow = getAddress(item.escrow);
      const kunci = `${escrow}:${item.proof_uri}`;
      if (sudahDinilai.has(kunci)) continue;

      // API itu cache — sebelum kirim tx, cek kebenarannya di chain
      const e = await readEscrow(escrow);
      if (e.status !== STATUS_DISUBMIT) {
        sudahDinilai.add(kunci); // indexer belum sinkron / sudah dinilai orang
        continue;
      }

      console.log(`\n[${escrow}]`);
      console.log(`  worker: ${e.worker}`);
      console.log(`  proof : ${e.proofURI}`);

      const { eligible, alasan } = await judgeSubmission(e.rulesURI, e.proofURI, e.worker);
      console.log(`  verdict AI: ${eligible ? "ELIGIBLE" : "DITOLAK"} (${alasan})`);

      const { hash, sukses } = await sendVerdict(escrow, eligible);
      console.log(`  tx: ${hash} (${sukses ? "sukses" : "GAGAL"})`);
      sudahDinilai.add(kunci);
      if (sukses) await laporVerdict(escrow, e.worker, eligible, alasan, hash);
    }
  } catch (e) {
    console.log(`Error loop (lanjut lagi): ${e}`);
  }
  await sleep(INTERVAL);
}
