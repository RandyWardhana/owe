import { inflateRawSync } from "node:zlib";
import { createDecipheriv, createHash } from "node:crypto";

import { methodMeta } from "./payments";
import type { PayMethodKey } from "./types";
import {
  NO_HOLDER,
  type AdminAccount,
  type AdminClaimable,
  type AdminHolder,
  type AdminObject,
  type BillDetail,
  type BillSummary,
} from "./adminTypes";

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
  claims?: string | null;
  updated_at: string;
  owned: number;
  sync_key?: string | null;
  proofs?: number;
}

interface ProofRow {
  person_index: number;
  r2_key: string;
  content_type: string;
  size: number;
  uploaded_at: string;
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

type WireAccount = { k: string; v: string };
type WireItem = { n: string; q: number; s: number; sp?: number; u?: number };
type WirePerson = { n: string; t: number; ac?: WireAccount[]; it?: WireItem[] };
type WireClaimable = { i: string; n: string; q: number; a: number };

function parseJson<T>(text: string | null | undefined, fallback: T): T {
  try {
    const value = JSON.parse(text || "");
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

const accountsOf = (person: WirePerson | undefined): AdminAccount[] =>
  (person?.ac || [])
    .filter((a) => a && a.v)
    .map((a) => ({
      key: a.k,
      label: methodMeta(a.k as PayMethodKey).label,
      value: a.v,
    }));

function holderOf(people: WirePerson[], payerIndex: number): AdminHolder {
  const payer = payerIndex >= 0 ? people[payerIndex] : undefined;
  if (!payer) return { key: NO_HOLDER, name: "No payer set", accounts: [] };
  const accounts = accountsOf(payer);
  const name = payer.n?.trim() || "Unnamed";
  const fingerprint = accounts
    .map((a) => `${a.key}:${a.value.replace(/\s+/g, "")}`)
    .sort()
    .join("|");
  return { key: `${name.toLowerCase()}#${fingerprint}`, name, accounts };
}

export function toSummary(row: BillRow): BillSummary {
  const p = readBillPayload(row.data);
  const people = (p?.pp as WirePerson[]) || [];
  const payerIndex = typeof p?.py === "number" ? (p.py as number) : -1;
  const paid = parseJson<number[]>(row.paid, []);
  const claims = parseJson<Record<string, number[]>>(row.claims, {});
  const claimable = (p?.ui as WireClaimable[]) || [];

  return {
    id: row.id,
    title: (p?.t as string) || "(unreadable)",
    currency: (p?.c as string) || "",
    grandTotal: (p?.g as number) || 0,
    names: people.map((x) => x.n || "—"),
    payer: payerIndex,
    paid: Array.isArray(paid) ? paid : [],
    holder: holderOf(people, payerIndex),
    paidCount: Array.isArray(paid) ? paid.length : 0,
    proofs: row.proofs ?? 0,
    unclaimed: claimable.filter((item) => !(claims[item.i] || []).length).length,
    owned: Number(row.owned) === 1,
    syncKey: row.sync_key || null,
    updatedAt: row.updated_at,
    readable: p !== null,
  };
}

export function toDetail(row: BillRow, proofRows: ProofRow[]): BillDetail {
  const summary = toSummary({ ...row, proofs: proofRows.length });
  const p = readBillPayload(row.data);
  const people = (p?.pp as WirePerson[]) || [];
  const payerIndex = typeof p?.py === "number" ? (p.py as number) : -1;
  const paid = new Set(parseJson<number[]>(row.paid, []));
  const claims = parseJson<Record<string, number[]>>(row.claims, {});
  const feeRate = (p?.fr as number) || 0;
  const claimableWire = (p?.ui as WireClaimable[]) || [];
  const proofs = new Map(proofRows.map((r) => [r.person_index, r]));

  const claimable: AdminClaimable[] = claimableWire.map((item) => ({
    id: item.i,
    name: item.n,
    qty: item.q || 1,
    amount: item.a || 0,
    claimedBy: (claims[item.i] || []).map((i) => people[i]?.n || `Person ${i + 1}`),
  }));

  return {
    ...summary,
    feeRate,
    claimable,
    raw: p ? { ...p, paidOnServer: [...paid], claims } : null,
    people: people.map((person, index) => {
      const proof = proofs.get(index);
      return {
        index,
        name: person.n || "—",
        total: person.t || 0,
        isPayer: index === payerIndex,
        paid: paid.has(index),
        accounts: accountsOf(person),
        items: (person.it || []).map((item) => ({
          name: item.n,
          qty: item.q || 1,
          share: item.s || 0,
          ...(item.sp ? { split: item.sp } : {}),
          ...(item.u ? { units: item.u } : {}),
        })),
        claimed: claimableWire
          .filter((item) => (claims[item.i] || []).includes(index))
          .map((item) => {
            const count = (claims[item.i] || []).length || 1;
            return { name: item.n, amount: ((item.a || 0) * (1 + feeRate)) / count };
          }),
        proof: proof
          ? {
              index,
              key: proof.r2_key,
              contentType: proof.content_type,
              size: proof.size,
              uploadedAt: proof.uploaded_at,
            }
          : null,
      };
    }),
  };
}

async function loadBill(id: string): Promise<{ bill: BillRow; proofs: ProofRow[] } | null> {
  const direct = await call<{ bill: BillRow | null; proofs?: ProofRow[] }>(
    `/admin/bill?id=${encodeURIComponent(id)}`,
  );
  if (direct?.bill) return { bill: direct.bill, proofs: direct.proofs ?? [] };

  const all = await listBills();
  const bill = all?.bills.find((b) => b.id === id);
  if (!bill) return null;
  const listed = await call<{ proofs: { index: number; uploadedAt: string }[] }>(
    `/proofs?id=${encodeURIComponent(id)}`,
  );
  const proofs = (listed?.proofs ?? []).map((p) => ({
    person_index: p.index,
    r2_key: "",
    content_type: "",
    size: 0,
    uploaded_at: p.uploadedAt,
  }));
  return { bill, proofs };
}

export async function getBillDetail(id: string): Promise<BillDetail | null> {
  const found = await loadBill(id);
  return found ? toDetail(found.bill, found.proofs) : null;
}

export async function getBillRow(id: string): Promise<BillRow | null> {
  return (await loadBill(id))?.bill ?? null;
}

export function locateKey(key: string): { billId: string; personIndex: number } | null {
  const match = key.match(/^([^/]+)\/(\d+)(?:-[^/]*)?\//);
  return match ? { billId: match[1], personIndex: Number(match[2]) } : null;
}

export async function fetchProofFile(billId: string, index: number): Promise<Response | null> {
  if (!adminReady()) return null;
  try {
    const res = await fetch(`${base}/proof?id=${encodeURIComponent(billId)}&i=${index}`, {
      headers: { "x-owe-secret": secret },
      cache: "no-store",
    });
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

export const setOwner = (id: string, ownerHash: string, syncKey?: string) =>
  call<{ ok: boolean; changed: number }>(`/admin/owner?id=${encodeURIComponent(id)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ owner_hash: ownerHash, ...(syncKey ? { sync_key: syncKey } : {}) }),
  });

export async function fetchObject(key: string): Promise<Response | null> {
  if (!adminReady()) return null;
  try {
    const res = await fetch(`${base}/admin/object?key=${encodeURIComponent(key)}`, {
      headers: { "x-owe-secret": secret },
      cache: "no-store",
    });
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

export const listBills = () => call<{ bills: BillRow[] }>("/admin/bills");
export interface BackupRow {
  key: string;
  size: number;
  updated_at: string;
  bill_ids?: string | null;
  name?: string | null;
}

export const listBackups = () => call<{ backups: BackupRow[]; indexed?: boolean }>("/admin/backups");

export const backupBillIds = (row: BackupRow): string[] => {
  const ids = parseJson<unknown>(row.bill_ids, []);
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
};
export const indexBackup = (key: string, bills: string[]) =>
  call<{ ok: boolean; changed: number }>(`/admin/backup-bills?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ bills }),
  });
export const getBackup = (key: string) =>
  call<{ backup: { data: string; updated_at: string } | null }>(
    `/admin/backup?key=${encodeURIComponent(key)}`,
  );
export async function listObjects(prefix = ""): Promise<AdminObject[] | null> {
  const out = await call<{
    objects: {
      key: string;
      size: number;
      uploaded: string;
      orphan: boolean;
      bill_id?: string | null;
      person_index?: number | null;
      content_type?: string | null;
    }[];
  }>(`/admin/objects?prefix=${encodeURIComponent(prefix)}`);
  if (!out) return null;
  return out.objects.map((o) => {
    const located = o.orphan ? null : locateKey(o.key);
    return {
      key: o.key,
      size: o.size,
      uploaded: o.uploaded,
      orphan: o.orphan,
      billId: o.bill_id ?? located?.billId ?? null,
      personIndex: o.person_index ?? located?.personIndex ?? null,
      contentType: o.content_type ?? null,
    };
  });
}
export const deleteBackup = (key: string) =>
  call<{ ok: boolean; changed: number }>(`/admin/backup?key=${encodeURIComponent(key)}`, { method: "DELETE" });
export const deleteBillAdmin = (id: string) =>
  call<{ ok: boolean; proofs: number; files: number }>(`/admin/bill?id=${encodeURIComponent(id)}`, { method: "DELETE" });
export const deleteObject = (key: string) =>
  call<{ ok: boolean }>(`/admin/object?key=${encodeURIComponent(key)}`, { method: "DELETE" });
export const putBackup = (key: string, data: string, bills?: string[]) =>
  call<{ ok: boolean }>("/sync", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key, data, ...(bills ? { bills } : {}) }),
  });
