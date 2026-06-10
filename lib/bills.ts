import { hasSupabase } from "./supabase";
import type { SharePayload } from "./types";

/* Cloud layer for shared bills, proxied through our own server (/api/bill) so
   the browser never talks to Supabase directly. Stores `{ id, data, paid }`:
   - id   — deterministic, derived from the bill (same for everyone)
   - data — the encrypted share string, so a short link can point to the bill
   - paid — which person indices have settled
   Every call no-ops gracefully when cloud isn't configured / offline. */

function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

/** Deterministic bill id — same for everyone who opens the same bill. */
export function billId(p: SharePayload): string {
  const sig = JSON.stringify([p.t, p.c, p.g, p.pp.map((x) => [x.n, x.t])]);
  let h = 0;
  for (let i = 0; i < sig.length; i++) h = (h * 31 + sig.charCodeAt(i)) | 0;
  return "owe-" + (h >>> 0).toString(36).padStart(6, "0");
}

/** Stores the encrypted bill so a short link can resolve it. Returns success. */
export async function saveBill(id: string, data: string): Promise<boolean> {
  if (!hasSupabase || !isOnline()) return false;
  try {
    const r = await fetch("/api/bill", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, data }),
    });
    if (!r.ok) return false;
    const j = (await r.json()) as { ok?: boolean };
    return Boolean(j.ok);
  } catch {
    return false;
  }
}

/** Loads a stored bill (encrypted data + paid state) by id. */
export async function fetchBill(
  id: string,
): Promise<{ data: string | null; paid: number[] } | null> {
  if (!hasSupabase || !isOnline()) return null;
  try {
    const r = await fetch(`/api/bill?id=${encodeURIComponent(id)}`);
    if (!r.ok) return null;
    const j = (await r.json()) as { data?: string | null; paid?: number[] };
    return {
      data: j.data ?? null,
      paid: Array.isArray(j.paid) ? j.paid : [],
    };
  } catch {
    return null;
  }
}

/** Returns the server's paid indices, or null if unavailable / not found. */
export async function fetchPaid(id: string): Promise<number[] | null> {
  const row = await fetchBill(id);
  return row ? row.paid : null;
}

/** Upserts the paid indices for a bill. No-ops when offline / unconfigured. */
export async function savePaid(id: string, paid: number[]): Promise<void> {
  if (!hasSupabase || !isOnline()) return;
  try {
    await fetch("/api/bill", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, paid }),
    });
  } catch {
    /* best-effort */
  }
}

/** Polls for paid changes on a bill (every 5s). Returns an unsubscribe fn. */
export function subscribePaid(
  id: string,
  onChange: (paid: number[]) => void,
): () => void {
  if (!hasSupabase) return () => {};
  let stopped = false;
  let last = "";

  const tick = async () => {
    if (stopped || !isOnline()) return;
    const paid = await fetchPaid(id);
    if (stopped || !paid) return;
    const key = JSON.stringify(paid);
    if (key !== last) {
      last = key;
      onChange(paid);
    }
  };

  const interval = setInterval(tick, 5000);
  tick();

  return () => {
    stopped = true;
    clearInterval(interval);
  };
}
