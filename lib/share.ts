import type { SharePayload } from "./types";

export function encodeShare(obj: SharePayload): string {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(obj))))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  } catch {
    return "";
  }
}

export function decodeShare(str: string): SharePayload | null {
  try {
    const b = str.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(escape(atob(b)))) as SharePayload;
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
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
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
  const cs = new CompressionStream(mode);
  const w = cs.writable.getWriter();
  w.write(bytes);
  w.close();
  return new Uint8Array(await new Response(cs.readable).arrayBuffer());
}
async function unsqueeze(
  bytes: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array<ArrayBuffer>> {
  const ds = new DecompressionStream("deflate-raw");
  const w = ds.writable.getWriter();
  w.write(bytes);
  w.close();
  return new Uint8Array(await new Response(ds.readable).arrayBuffer());
}

export async function encryptShare(obj: SharePayload): Promise<string> {
  try {
    const key = await shareKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const raw = new TextEncoder().encode(JSON.stringify(obj));
    const data = await squeeze(raw, "deflate-raw");
    const ct = new Uint8Array(
      await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data),
    );
    const packed = new Uint8Array(iv.length + ct.length);
    packed.set(iv, 0);
    packed.set(ct, iv.length);
    return bytesToB64url(packed);
  } catch {
    return encodeShare(obj);
  }
}

export async function decryptShare(token: string): Promise<SharePayload | null> {
  try {
    const packed = b64urlToBytes(token);
    const iv = packed.slice(0, 12);
    const ct = packed.slice(12);
    const key = await shareKey();
    const data = new Uint8Array(
      await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct),
    );
    const raw = await unsqueeze(data);
    return JSON.parse(new TextDecoder().decode(raw)) as SharePayload;
  } catch {
    return decodeShare(token);
  }
}
