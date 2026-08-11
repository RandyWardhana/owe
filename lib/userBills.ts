import { hasSupabase } from "./supabase";
import { deviceId } from "./device";
import { decryptJSON, digestHex, encryptJSON, online } from "./vault";
import type { Draft } from "./types";

export async function pullHistory(): Promise<Draft[] | null> {
  const id = deviceId();
  if (!hasSupabase || !id || !online()) return null;
  try {
    const key = await digestHex(id);
    const response = await fetch(`/api/sync?key=${encodeURIComponent(key)}`);
    if (!response.ok) return null;
    const json = (await response.json()) as { data?: string | null };
    if (!json.data) return null;
    const parsed = await decryptJSON<Draft[]>(json.data, id);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function pushHistory(history: Draft[]): Promise<void> {
  // never overwrite the cloud copy with an empty list — a failed restore on a
  // fresh/evicted context would otherwise wipe a good backup
  if (!history.length) return;
  const id = deviceId();
  if (!hasSupabase || !id || !online()) return;
  try {
    const key = await digestHex(id);
    const data = await encryptJSON(history, id);
    await fetch("/api/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key, data }),
    });
  } catch {
    /* best-effort */
  }
}
