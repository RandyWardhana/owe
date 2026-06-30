import type { SharedBill, SharePayload } from "./types";

/* ---- Wire mapping ----------------------------------------------------------
   SharedBill (readable) <-> SharePayload (compact, URL-friendly). Keeping the
   short keys only on the wire means existing share links stay valid and new
   ones stay small, while all app code works with full, maintainable names. */

function toWire(bill: SharedBill): SharePayload {
  return {
    v: bill.version,
    t: bill.title,
    c: bill.currency,
    g: bill.grandTotal,
    py: bill.payerIndex,
    pp: bill.people.map((person) => ({
      n: person.name,
      t: person.total,
      ac: person.accounts.map((account) => ({ k: account.key, v: account.value })),
      it: person.items.map((item) => ({
        n: item.name,
        q: item.qty,
        s: item.share,
        // Carry the split count only when shared — keeps the URL compact.
        ...(item.split ? { sp: item.split } : {}),
      })),
    })),
    pd: bill.paidIndices,
  };
}

function fromWire(payload: SharePayload): SharedBill {
  return {
    version: payload.v,
    title: payload.t,
    currency: payload.c,
    grandTotal: payload.g,
    payerIndex: payload.py,
    people: (payload.pp || []).map((person) => ({
      name: person.n,
      total: person.t,
      accounts: (person.ac || []).map((account) => ({
        key: account.k,
        value: account.v,
      })),
      items: (person.it || []).map((item) => ({
        name: item.n,
        qty: item.q,
        share: item.s,
        split: item.sp,
      })),
    })),
    paidIndices: payload.pd || [],
  };
}

/* ---- Plain (unencrypted) base64url encoding — fallback for the long link --- */

export function encodeShare(bill: SharedBill): string {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(toWire(bill)))))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  } catch {
    return "";
  }
}

export function decodeShare(str: string): SharedBill | null {
  try {
    const normalized = str.replace(/-/g, "+").replace(/_/g, "/");
    const wire = JSON.parse(decodeURIComponent(escape(atob(normalized)))) as SharePayload;
    return fromWire(wire);
  } catch {
    return null;
  }
}

const KEY_PHRASE = "owe.share.v1::9be52e-ink-cream";

let keyPromise: Promise<CryptoKey> | null = null;
function shareKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    keyPromise = (async () => {
      const seed = new TextEncoder().encode(KEY_PHRASE);
      const hash = await crypto.subtle.digest("SHA-256", seed);
      return crypto.subtle.importKey("raw", hash, "AES-GCM", false, [
        "encrypt",
        "decrypt",
      ]);
    })();
  }
  return keyPromise;
}

function bytesToB64url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(str: string): Uint8Array {
  const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function squeeze(
  bytes: Uint8Array<ArrayBuffer>,
  mode: "deflate-raw",
): Promise<Uint8Array<ArrayBuffer>> {
  const stream = new CompressionStream(mode);
  const writer = stream.writable.getWriter();
  writer.write(bytes);
  writer.close();
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}
async function unsqueeze(
  bytes: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array<ArrayBuffer>> {
  const stream = new DecompressionStream("deflate-raw");
  const writer = stream.writable.getWriter();
  writer.write(bytes);
  writer.close();
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

export async function encryptShare(bill: SharedBill): Promise<string> {
  try {
    const key = await shareKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const raw = new TextEncoder().encode(JSON.stringify(toWire(bill)));
    const data = await squeeze(raw, "deflate-raw");
    const ciphertext = new Uint8Array(
      await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data),
    );
    const packed = new Uint8Array(iv.length + ciphertext.length);
    packed.set(iv, 0);
    packed.set(ciphertext, iv.length);
    return bytesToB64url(packed);
  } catch {
    return encodeShare(bill);
  }
}

export async function decryptShare(token: string): Promise<SharedBill | null> {
  try {
    const packed = b64urlToBytes(token);
    const iv = packed.slice(0, 12);
    const ciphertext = packed.slice(12);
    const key = await shareKey();
    const data = new Uint8Array(
      await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext),
    );
    const raw = await unsqueeze(data);
    const wire = JSON.parse(new TextDecoder().decode(raw)) as SharePayload;
    return fromWire(wire);
  } catch {
    return decodeShare(token);
  }
}
