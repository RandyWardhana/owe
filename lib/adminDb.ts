import { inflateRawSync } from "node:zlib";
import { createDecipheriv, createHash } from "node:crypto";

import { methodMeta } from "./payments";
import { fromWire } from "./share";
import type { SharePayload, SharedBill, SharedBillPerson } from "../entities/share";
import type {
  AdminAccount,
  AdminBillRow,
  AdminClaimable,
  AdminHolder,
  AdminObject,
  AdminProofRow,
  BackupRow,
  BillDetail,
  BillSummary,
} from "../entities/admin";
import { NO_HOLDER } from "./adminConstants";

// Bills decrypt here because the share key ships with the app; device backups never can, since
// they are encrypted with the sync code and the server only stores its hash.

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

function shareKey(): Buffer {
  return createHash("sha256").update(KEY_PHRASE).digest();
}

function readWire(data: string | null): SharePayload | null {
  if (!data) return null;
  try {
    const packed = Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    const iv = packed.subarray(0, 12);
    const tag = packed.subarray(packed.length - 16);
    const body = packed.subarray(12, packed.length - 16);
    const decipher = createDecipheriv("aes-256-gcm", shareKey(), iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(body), decipher.final()]);
    let text: string;
    try {
      text = inflateRawSync(plain).toString("utf8");
    } catch {
      text = plain.toString("utf8");
    }
    return JSON.parse(text) as SharePayload;
  } catch {
    return null;
  }
}

function parseJson<T>(text: string | null | undefined, fallback: T): T {
  try {
    const value = JSON.parse(text || "");
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

const accountsOf = (person: SharedBillPerson | undefined): AdminAccount[] =>
  (person?.accounts ?? [])
    .filter((account) => account && account.value)
    .map((account) => ({
      key: account.key,
      label: methodMeta(account.key).label,
      value: account.value,
    }));

function holderOf(people: SharedBillPerson[], payerIndex: number): AdminHolder {
  const payer = payerIndex >= 0 ? people[payerIndex] : undefined;
  if (!payer) return { key: NO_HOLDER, name: "No payer set", accounts: [] };
  const accounts = accountsOf(payer);
  const name = payer.name?.trim() || "Unnamed";
  const fingerprint = accounts
    .map((account) => `${account.key}:${account.value.replace(/\s+/g, "")}`)
    .sort()
    .join("|");
  return { key: `${name.toLowerCase()}#${fingerprint}`, name, accounts };
}

const payerOf = (bill: SharedBill | null) => (typeof bill?.payerIndex === "number" ? bill.payerIndex : -1);

async function loadBill(id: string): Promise<{ bill: AdminBillRow; proofs: AdminProofRow[] } | null> {
  const direct = await call<{ bill: AdminBillRow | null; proofs?: AdminProofRow[] }>(
    `/admin/bill?id=${encodeURIComponent(id)}`,
  );
  if (direct?.bill) return { bill: direct.bill, proofs: direct.proofs ?? [] };

  const all = await listBills();
  const bill = all?.bills.find((row) => row.id === id);
  if (!bill) return null;
  const listed = await call<{ proofs: { index: number; uploadedAt: string }[] }>(
    `/proofs?id=${encodeURIComponent(id)}`,
  );
  const proofs = (listed?.proofs ?? []).map((proof) => ({
    person_index: proof.index,
    r2_key: "",
    content_type: "",
    size: 0,
    uploaded_at: proof.uploadedAt,
  }));
  return { bill, proofs };
}

export function readSharedBill(data: string | null): SharedBill | null {
  const wire = readWire(data);
  return wire && typeof wire === "object" ? fromWire(wire) : null;
}

export function toSummary(row: AdminBillRow): BillSummary {
  const bill = readSharedBill(row.data);
  const people = bill?.people ?? [];
  const payerIndex = payerOf(bill);
  const paid = parseJson<number[]>(row.paid, []);
  const claims = parseJson<Record<string, number[]>>(row.claims, {});
  const claimable = bill?.claimable ?? [];

  return {
    id: row.id,
    title: bill?.title || "(unreadable)",
    currency: bill?.currency || "",
    grandTotal: bill?.grandTotal || 0,
    names: people.map((person) => person.name || "—"),
    payer: payerIndex,
    paid: Array.isArray(paid) ? paid : [],
    holder: holderOf(people, payerIndex),
    paidCount: Array.isArray(paid) ? paid.length : 0,
    proofs: row.proofs ?? 0,
    unclaimed: claimable.filter((item) => !(claims[item.id] || []).length).length,
    owned: Number(row.owned) === 1,
    syncKey: row.sync_key || null,
    updatedAt: row.updated_at,
    readable: bill !== null,
  };
}

export function toDetail(row: AdminBillRow, proofRows: AdminProofRow[]): BillDetail {
  const summary = toSummary({ ...row, proofs: proofRows.length });
  const bill = readSharedBill(row.data);
  const people = bill?.people ?? [];
  const payerIndex = payerOf(bill);
  const paid = new Set(parseJson<number[]>(row.paid, []));
  const claims = parseJson<Record<string, number[]>>(row.claims, {});
  const feeRate = bill?.feeRate || 0;
  const claimableItems = bill?.claimable ?? [];
  const proofs = new Map(proofRows.map((proofRow) => [proofRow.person_index, proofRow]));
  const claimersOf = (item: { id: string }) => claims[item.id] || [];

  const claimable: AdminClaimable[] = claimableItems.map((item) => ({
    id: item.id,
    name: item.name,
    qty: item.qty || 1,
    amount: item.amount || 0,
    claimedBy: claimersOf(item).map((index) => people[index]?.name || `Person ${index + 1}`),
  }));

  return {
    ...summary,
    feeRate,
    claimable,
    raw: bill ? { ...bill, paidOnServer: [...paid], claims } : null,
    people: people.map((person, index) => {
      const proof = proofs.get(index);
      return {
        index,
        name: person.name || "—",
        total: person.total || 0,
        isPayer: index === payerIndex,
        paid: paid.has(index),
        accounts: accountsOf(person),
        items: person.items.map((item) => ({
          name: item.name,
          qty: item.qty || 1,
          share: item.share || 0,
          ...(item.split ? { split: item.split } : {}),
          ...(item.units ? { units: item.units } : {}),
        })),
        claimed: claimableItems
          .filter((item) => claimersOf(item).includes(index))
          .map((item) => ({
            name: item.name,
            amount: ((item.amount || 0) * (1 + feeRate)) / (claimersOf(item).length || 1),
          })),
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

export async function getBillDetail(id: string): Promise<BillDetail | null> {
  const found = await loadBill(id);
  return found ? toDetail(found.bill, found.proofs) : null;
}

export async function getBillRow(id: string): Promise<AdminBillRow | null> {
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

export const listBills = () => call<{ bills: AdminBillRow[] }>("/admin/bills");
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
  return out.objects.map((object) => {
    const located = object.orphan ? null : locateKey(object.key);
    return {
      key: object.key,
      size: object.size,
      uploaded: object.uploaded,
      orphan: object.orphan,
      billId: object.bill_id ?? located?.billId ?? null,
      personIndex: object.person_index ?? located?.personIndex ?? null,
      contentType: object.content_type ?? null,
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
