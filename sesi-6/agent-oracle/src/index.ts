// index.ts = loop utama: antrean -> verifikasi chain -> nilai AI -> tx -> lapor

import { getAddress } from "viem";
import { BACKEND_API_URL, POLL_INTERVAL_MS } from "./config";
import { STATUS_DISUBMIT } from "./contracts";
import { account } from "./lib/chain";
import { getPending, laporVerdict } from "./services/api";
import { judgeSubmission } from "./services/judge";
import { oracleOnchain, readEscrow, sendVerdict } from "./services/oracle";

const oracle = await oracleOnchain();
console.log(`Agent wallet   : ${account.address}`);
console.log(`Oracle on-chain: ${oracle}`);
if (oracle.toLowerCase() !== account.address.toLowerCase())
  console.log("PERINGATAN: wallet agent BUKAN oracle di factory. Tx bakal revert BukanOracle.");

const sudahDinilai = new Set<string>(); // "escrow:proofURI" yang sudah diproses

console.log(`Antrean dari ${BACKEND_API_URL}/pending, polling tiap ${POLL_INTERVAL_MS / 1000} detik. Ctrl+C buat berhenti.`);
while (true) {
  try {
    for (const item of await getPending()) {
      const escrow = getAddress(item.escrow);
      const kunci = `${escrow}:${item.proof_uri}`;
      if (sudahDinilai.has(kunci)) continue;

      // API itu cache — sebelum kirim tx, cek kebenarannya di chain
      const e = await readEscrow(escrow);
      if (e.status !== STATUS_DISUBMIT) {
        sudahDinilai.add(kunci); // indexer belum sinkron / sudah dinilai orang
        continue;
      }

      console.log(`\n[${escrow}]\n  worker: ${e.worker}\n  proof : ${e.proofURI}`);

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
  await Bun.sleep(POLL_INTERVAL_MS);
}
