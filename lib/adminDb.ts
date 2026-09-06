import { inflateRawSync } from "node:zlib";
import { createDecipheriv, createHash } from "node:crypto";

/* Server-side admin reads.
   Bills decrypt here because the share key is a constant the app already ships;
   device backups never can, since they are encrypted with the sync code itself
   and the server only stores its hash. */

const base = (process.env.OWE_DB_URL ?? "").replace(/\/+$/, "");
const secret = process.env.OWE_DB_SECRET ?? "";

const KEY_PHRASE = "owe.share.v1::9be52e-ink-cream";

export const adminReady = (): boolean => Boolean(base && secret);

async function call<T>(path: string, init: RequestInit = {}): Promise<T | null> {
  if (!adminReady()) return null;
  try {
    const res = await fetch(base + path, {
      ...init,
      headers: { "x-owe-secret": secret, ...(init.headers as Record<string, string>) },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export interface BillRow {
  id: string;
  data: string | null;
  paid: string;
  updated_at: string;
  owned: number;
  proofs: number;
}

export interface BillView {
  id: string;
  title: string;
  currency: string;
  grandTotal: number;
  people: { name: string; total: number }[];
  payer: string | null;
  paid: number[];
  proofs: number;
  owned: boolean;
  updatedAt: string;
  readable: boolean;
}

function shareKey(): Buffer {
  return createHash("sha256").update(KEY_PHRASE).digest();
}

/** Decrypt one bill payload. Returns null when it cannot be read. */
export function readBillPayload(data: string | null): Record<string, unknown> | null {
  if (!data) return null;
  try {
    const packed = Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    const iv = packed.subarray(0, 12);
    const tag = packed.subarray(packed.length - 16);
    const body = packed.subarray(12, packed.length - 16);
    const d = createDecipheriv("aes-256-gcm", shareKey(), iv);
    d.setAuthTag(tag);
    const plain = Buffer.concat([d.update(body), d.final()]);
    let text: string;
    try {
      text = inflateRawSync(plain).toString("utf8");
    } catch {
      text = plain.toString("utf8");
    }
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function toView(row: BillRow): BillView {
  const p = readBillPayload(row.data);
  const people = ((p?.pp as { n: string; t: number }[]) || []).map((x) => ({
    name: x.n || "—",
    total: x.t || 0,
  }));
  let paid: number[] = [];
  try {
    paid = JSON.parse(row.paid || "[]");
  } catch {
    paid = [];
  }
  const payerIndex = typeof p?.py === "number" ? (p.py as number) : -1;

  return {
    id: row.id,
    title: (p?.t as string) || "(unreadable)",
    currency: (p?.c as string) || "",
    grandTotal: (p?.g as number) || 0,
    people,
    payer: payerIndex >= 0 ? people[payerIndex]?.name ?? null : null,
    paid,
    proofs: row.proofs,
    owned: row.owned === 1,
    updatedAt: row.updated_at,
    readable: p !== null,
  };
}

export const listBills = () => call<{ bills: BillRow[] }>("/admin/bills");
export const listBackups = () =>
  call<{ backups: { key: string; size: number; updated_at: string }[] }>("/admin/backups");
export const getBackup = (key: string) =>
  call<{ backup: { data: string; updated_at: string } | null }>(
    `/admin/backup?key=${encodeURIComponent(key)}`,
  );
export const listObjects = (prefix = "") =>
  call<{ objects: { key: string; size: number; uploaded: string; orphan: boolean }[] }>(
    `/admin/objects?prefix=${encodeURIComponent(prefix)}`,
  );
export const releaseBill = (id: string) =>
  call<{ ok: boolean; changed: number }>(`/admin/release?id=${encodeURIComponent(id)}`, {
    method: "POST",
  });
export const deleteObject = (key: string) =>
  call<{ ok: boolean }>(`/admin/object?key=${encodeURIComponent(key)}`, { method: "DELETE" });
export const putBackup = (key: string, data: string) =>
  call<{ ok: boolean }>("/sync", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key, data }),
  });
