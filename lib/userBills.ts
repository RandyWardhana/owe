import { hasSupabase } from "./supabase";
import { deviceId } from "./device";
import type { Draft } from "./types";

function online(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

async function digestHex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function keyFor(id: string): Promise<CryptoKey> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode("owe.user.v1::" + id),
  );
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromB64(str: string): Uint8Array {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function encrypt(history: Draft[], id: string): Promise<string> {
  const key = await keyFor(id);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const raw = new TextEncoder().encode(JSON.stringify(history));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, raw),
  );
  const packed = new Uint8Array(iv.length + ct.length);
  packed.set(iv, 0);
  packed.set(ct, iv.length);
  return toB64(packed);
}

async function decrypt(data: string, id: string): Promise<Draft[] | null> {
  try {
    const key = await keyFor(id);
    const packed = fromB64(data);
    const iv = packed.slice(0, 12);
    const ct = packed.slice(12);
    const raw = new Uint8Array(
      await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct),
    );
    const parsed = JSON.parse(new TextDecoder().decode(raw));
    return Array.isArray(parsed) ? (parsed as Draft[]) : null;
  } catch {
    return null;
  }
}

export async function pullHistory(): Promise<Draft[] | null> {
  const id = deviceId();
  if (!hasSupabase || !id || !online()) return null;
  try {
    const key = await digestHex(id);
    const r = await fetch(`/api/sync?key=${encodeURIComponent(key)}`);
    if (!r.ok) return null;
    const json = (await r.json()) as { data?: string | null };
    if (!json.data) return null;
    return decrypt(json.data, id);
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
    const data = await encrypt(history, id);
    await fetch("/api/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key, data }),
    });
  } catch {
    /* best-effort */
  }
}
