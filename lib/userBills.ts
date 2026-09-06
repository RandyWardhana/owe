import { hasCloudSync } from "./cloudSync";
import { deviceId } from "./device";
import { adoptTokens, allTokens } from "./billOwner";
import { contacts, mergeContacts, type Contact } from "./addressBook";
import type { Draft } from "./types";

function online(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

async function digestHex(text: string): Promise<string> {
  const buffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
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
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromB64(str: string): Uint8Array {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

interface Payload {
  history: Draft[];
  /* Bills deleted on any device. Without these a delete is undone by the very
     next sync, which reads as the app losing your instruction. */
  tombstones?: Record<string, number>;
  /* Saved people. Re-entering everyone's bank details on a second device is
     the tedium this app exists to remove; it should not reappear the moment
     you pick up a different phone. */
  contacts?: Contact[];
  /* billId -> owner token. Without these, your other device can see a bill it
     created but cannot confirm anyone's payment on it: the token proving
     ownership lived only in the browser that first shared it. */
  owners?: Record<string, string>;
}

async function encrypt(payload: Payload, id: string): Promise<string> {
  const key = await keyFor(id);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const raw = new TextEncoder().encode(JSON.stringify(payload));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, raw),
  );
  const packed = new Uint8Array(iv.length + ct.length);
  packed.set(iv, 0);
  packed.set(ct, iv.length);
  return toB64(packed);
}

async function decrypt(data: string, id: string): Promise<Payload | null> {
  try {
    const key = await keyFor(id);
    const packed = fromB64(data);
    const iv = packed.slice(0, 12);
    const ct = packed.slice(12);
    const raw = new Uint8Array(
      await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct),
    );
    const parsed = JSON.parse(new TextDecoder().decode(raw));
    // Older backups are a bare array; newer ones wrap it so tokens can ride along.
    if (Array.isArray(parsed)) return { history: parsed as Draft[] };
    if (parsed && Array.isArray(parsed.history)) return parsed as Payload;
    return null;
  } catch {
    return null;
  }
}

export async function pullHistory(): Promise<Payload | null> {
  const id = deviceId();
  if (!hasCloudSync || !id || !online()) return null;
  try {
    const key = await digestHex(id);
    const response = await fetch(`/api/sync?key=${encodeURIComponent(key)}`);
    if (!response.ok) return null;
    const json = (await response.json()) as { data?: string | null };
    if (!json.data) return null;
    const payload = await decrypt(json.data, id);
    if (!payload) return null;
    if (payload.owners) adoptTokens(payload.owners);
    if (payload.contacts) mergeContacts(payload.contacts);
    return payload;
  } catch {
    return null;
  }
}

/**
 * What actually goes over the wire.
 *
 * `step` is where the user is standing in the wizard, not a property of the
 * bill. syncSaved mirrors the live draft into its history entry on every
 * keystroke, so a bill being edited was pushed carrying step:"assign" -- and
 * the other device rendered a finished split as an unfinished draft. History is
 * a list of finished bills by definition, so it is normalised on the way out.
 */
function forSync(history: Draft[]): Draft[] {
  return history.map((entry) => ({ ...entry, step: "breakdown" as const }));
}

export async function pushHistory(
  history: Draft[],
  tombstones: Record<string, number> = {},
): Promise<void> {
  // never overwrite the cloud copy with an empty list — a failed restore on a
  // fresh/evicted context would otherwise wipe a good backup
  if (!history.length && !Object.keys(tombstones).length) return;
  const id = deviceId();
  if (!hasCloudSync || !id || !online()) return;
  try {
    const key = await digestHex(id);
    const data = await encrypt(
      { history: forSync(history), owners: allTokens(), tombstones, contacts: contacts() },
      id,
    );
    await fetch("/api/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key, data }),
    });
  } catch {
    /* best-effort */
  }
}
