// services/backend-api.ts = klien ke backend kita: ambil antrean + lapor verdict

import { BACKEND_API_URL } from "../config";

export type PendingItem = { escrow: string; proof_uri: string };

// Antrean submission yang menunggu penilaian (1 request menggantikan scan registry)
export const getPending = async (): Promise<PendingItem[]> => {
  const res = await fetch(`${BACKEND_API_URL}/pending`);
  if (!res.ok) throw new Error(`backend ${res.status}`);
  return ((await res.json()) as { pending: PendingItem[] }).pending;
};

// Simpan alasan AI ke backend — chain cuma tahu true/false
export const laporVerdict = async (escrow: string, worker: string, eligible: boolean, alasan: string, txHash: string) => {
  try {
    const res = await fetch(`${BACKEND_API_URL}/verdicts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ escrow, worker, eligible, alasan, tx_hash: txHash }),
    });
    if (!res.ok) throw new Error(String(res.status));
  } catch (e) {
    console.log(`  gagal lapor verdict ke backend (lanjut): ${e}`);
  }
};
