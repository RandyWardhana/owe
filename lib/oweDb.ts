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

export const writeBill = (body: {
  id: string;
  data?: string;
  paid?: number[];
}): Promise<{ ok: boolean }> =>
  call("/bill", {
    method: "POST",
    body: JSON.stringify(body),
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

/* Server-rendered share pages read the bill straight from here. */
export async function getBillData(id: string): Promise<string | null> {
  const { data } = await readBill(id);
  return data;
}
