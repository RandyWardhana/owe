/* Cloud storage for shared bills and per-device history.
   Replaces the Supabase client: the data now lives in Cloudflare D1, reached
   through the owe-db Worker (D1 bindings only work from Cloudflare compute, and
   this app runs on Vercel). Every call is server-side; the browser never holds
   the secret. */

const base = (process.env.OWE_DB_URL ?? "").replace(/\/+$/, "");
const secret = process.env.OWE_DB_SECRET ?? "";

export const serverHasDb = Boolean(base && secret);

async function call<T>(
  path: string,
  init: RequestInit & { fallback: T },
): Promise<T> {
  if (!serverHasDb) return init.fallback;
  try {
    const res = await fetch(base + path, {
      ...init,
      headers: {
        "x-owe-secret": secret,
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...(init.headers as Record<string, string> | undefined),
      },
      cache: "no-store",
    });
    if (!res.ok) return init.fallback;
    return (await res.json()) as T;
  } catch {
    return init.fallback;
  }
}

export type BillRow = { data: string | null; paid: number[] };

export const readBill = (id: string): Promise<BillRow> =>
  call(`/bill?id=${encodeURIComponent(id)}`, {
    method: "GET",
    fallback: { data: null, paid: [] },
  });

export const writeBill = (
  body: { id: string; data?: string; paid?: number[]; owner_hash?: string },
  ownerToken?: string,
): Promise<{ ok: boolean }> =>
  call("/bill", {
    method: "POST",
    body: JSON.stringify(body),
    ...(ownerToken ? { headers: { "x-owe-owner": ownerToken } } : {}),
    fallback: { ok: false },
  });

export const readUserBills = (key: string): Promise<{ data: string | null }> =>
  call(`/sync?key=${encodeURIComponent(key)}`, {
    method: "GET",
    fallback: { data: null },
  });

export const writeUserBills = (
  key: string,
  data: string,
): Promise<{ ok: boolean }> =>
  call("/sync", {
    method: "POST",
    body: JSON.stringify({ key, data }),
    fallback: { ok: false },
  });

export const listProofs = (
  billId: string,
): Promise<{ index: number; uploadedAt: string }[]> =>
  call<{ proofs: { index: number; uploadedAt: string }[] }>(
    `/proofs?id=${encodeURIComponent(billId)}`,
    { method: "GET", fallback: { proofs: [] } },
  ).then((body) => body.proofs);

export async function writeProof(
  billId: string,
  index: number,
  body: ArrayBuffer,
  contentType: string,
  name = "",
): Promise<{ ok: boolean }> {
  if (!serverHasDb) return { ok: false };
  try {
    const res = await fetch(
      `${base}/proof?id=${encodeURIComponent(billId)}&i=${index}&name=${encodeURIComponent(name)}`,
      {
        method: "POST",
        headers: { "x-owe-secret": secret, "content-type": contentType },
        body,
        cache: "no-store",
      },
    );
    if (!res.ok) return { ok: false };
    return (await res.json()) as { ok: boolean };
  } catch {
    return { ok: false };
  }
}

export async function readProof(
  billId: string,
  index: number,
  ownerToken: string,
): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  if (!serverHasDb) return null;
  try {
    const res = await fetch(
      `${base}/proof?id=${encodeURIComponent(billId)}&i=${index}`,
      {
        headers: { "x-owe-secret": secret, "x-owe-owner": ownerToken },
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    return {
      body: await res.arrayBuffer(),
      contentType: res.headers.get("content-type") ?? "application/octet-stream",
    };
  } catch {
    return null;
  }
}

export async function removeProof(
  billId: string,
  index: number,
  ownerToken: string,
): Promise<{ ok: boolean; status: number }> {
  if (!serverHasDb) return { ok: false, status: 503 };
  try {
    const res = await fetch(
      `${base}/proof?id=${encodeURIComponent(billId)}&i=${index}`,
      {
        method: "DELETE",
        headers: { "x-owe-secret": secret, "x-owe-owner": ownerToken },
        cache: "no-store",
      },
    );
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 500 };
  }
}

export async function removeBill(
  billId: string,
  ownerToken: string,
): Promise<{ ok: boolean; status: number }> {
  if (!serverHasDb) return { ok: false, status: 503 };
  try {
    const res = await fetch(`${base}/bill?id=${encodeURIComponent(billId)}`, {
      method: "DELETE",
      headers: { "x-owe-secret": secret, "x-owe-owner": ownerToken },
      cache: "no-store",
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 500 };
  }
}

/* Server-rendered share pages read the bill straight from here. */
export async function getBillData(id: string): Promise<string | null> {
  const { data } = await readBill(id);
  return data;
}
