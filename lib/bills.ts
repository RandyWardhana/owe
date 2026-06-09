import { getSupabase } from "./supabase";
import type { SharePayload } from "./types";

/* Cloud layer for shared bills. Stores `{ id, data, paid }`:
   - id   — deterministic, derived from the bill (same for everyone)
   - data — the encrypted share string, so a short link can point to the bill
   - paid — which person indices have settled
   Every call no-ops gracefully when Supabase isn't configured / offline. */

const TABLE = "bills";

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
  const client = await getSupabase();
  if (!client || !isOnline()) return false;
  try {
    const { error } = await client
      .from(TABLE)
      .upsert({ id, data, updated_at: new Date().toISOString() });
    return !error;
  } catch {
    return false;
  }
}

/** Loads a stored bill (encrypted data + paid state) by id. */
export async function fetchBill(
  id: string,
): Promise<{ data: string | null; paid: number[] } | null> {
  const client = await getSupabase();
  if (!client || !isOnline()) return null;
  try {
    const { data, error } = await client
      .from(TABLE)
      .select("data, paid")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return {
      data: (data.data as string) ?? null,
      paid: Array.isArray(data.paid) ? (data.paid as number[]) : [],
    };
  } catch {
    return null;
  }
}

/** Returns the server's paid indices, or null if unavailable / not found. */
export async function fetchPaid(id: string): Promise<number[] | null> {
  const client = await getSupabase();
  if (!client || !isOnline()) return null;
  try {
    const { data, error } = await client
      .from(TABLE)
      .select("paid")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return Array.isArray(data.paid) ? (data.paid as number[]) : [];
  } catch {
    return null;
  }
}

/** Upserts the paid indices for a bill. No-ops when offline / unconfigured. */
export async function savePaid(id: string, paid: number[]): Promise<void> {
  const client = await getSupabase();
  if (!client || !isOnline()) return;
  try {
    await client
      .from(TABLE)
      .upsert({ id, paid, updated_at: new Date().toISOString() });
  } catch {
    /* best-effort */
  }
}

/** Subscribes to live paid changes for a bill. Returns an unsubscribe fn. */
export function subscribePaid(
  id: string,
  onChange: (paid: number[]) => void,
): () => void {
  let cancelled = false;
  let cleanup: (() => void) | null = null;

  getSupabase().then((client) => {
    if (!client || cancelled) return;
    const channel = client
      .channel(`bill:${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE, filter: `id=eq.${id}` },
        (payload) => {
          const row = payload.new as { paid?: number[] } | null;
          if (row && Array.isArray(row.paid)) onChange(row.paid);
        },
      )
      .subscribe();
    cleanup = () => client.removeChannel(channel);
  });

  return () => {
    cancelled = true;
    cleanup?.();
  };
}
