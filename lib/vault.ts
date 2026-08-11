/* Shared crypto for the anonymous, per-device cloud backup (bill history and
   saved people). Rows are keyed by sha256(deviceId) and their payload is
   AES-GCM encrypted with a key derived from the same device id, which never
   leaves the browser — so the server only ever holds opaque blobs. */

export function online(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

/** Row key: the raw device id is never sent, only its digest. */
export async function digestHex(text: string): Promise<string> {
  const buffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// Unchanged from the original bill backup — existing rows must stay readable.
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

export async function encryptJSON(value: unknown, id: string): Promise<string> {
  const key = await keyFor(id);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const raw = new TextEncoder().encode(JSON.stringify(value));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, raw),
  );
  const packed = new Uint8Array(iv.length + ct.length);
  packed.set(iv, 0);
  packed.set(ct, iv.length);
  return toB64(packed);
}

export async function decryptJSON<T>(data: string, id: string): Promise<T | null> {
  try {
    const key = await keyFor(id);
    const packed = fromB64(data);
    const iv = packed.slice(0, 12);
    const ct = packed.slice(12);
    const raw = new Uint8Array(
      await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct),
    );
    return JSON.parse(new TextDecoder().decode(raw)) as T;
  } catch {
    return null;
  }
}
