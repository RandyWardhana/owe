import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";

import { readBillPayload, type BillRow } from "./adminDb";

/* Rebuilding a lost history from the bills the server still holds.
   A shared bill is not a draft: it records each person's SHARE of each item,
   with tax and service already folded into their totals but not into the shares
   themselves. Reconstruction has to put that back or every amount comes out
   short. */

const uid = () => randomUUID().slice(0, 7);

interface WirePerson {
  n: string;
  t: number;
  ac?: { k: string; v: string }[];
  it?: { n: string; q: number; s: number; sp?: number }[];
}

export interface RestoreResult {
  key: string;
  data: string;
  titles: string[];
}

function toDraft(
  p: Record<string, unknown>,
  shareId: string,
  when: number,
  paidIdx: number[],
) {
  const wire = (p.pp as WirePerson[]) || [];
  const people = wire.map((x) => ({
    id: uid(),
    name: x.n || "",
    accounts: (x.ac || []).map((a) => ({ id: uid(), key: a.k, value: a.v })),
  }));

  const groups = new Map<string, { name: string; qty: number; entries: { pi: number; share: number }[] }>();
  wire.forEach((person, pi) => {
    (person.it || []).forEach((it) => {
      const k = `${it.n}::${it.sp || 1}`;
      if (!groups.has(k)) groups.set(k, { name: it.n, qty: it.q || 1, entries: [] });
      groups.get(k)!.entries.push({ pi, share: it.s || 0 });
    });
  });

  const items: { id: string; name: string; qty: number; price: number; assignedTo: string[] }[] = [];
  for (const g of groups.values()) {
    const equal = g.entries.every((e) => Math.abs(e.share - g.entries[0].share) < 0.01);
    if (equal && g.entries.length > 1) {
      items.push({
        id: uid(), name: g.name, qty: g.qty,
        price: g.entries.reduce((s, e) => s + e.share, 0),
        assignedTo: g.entries.map((e) => people[e.pi].id),
      });
    } else {
      g.entries.forEach((e) =>
        items.push({ id: uid(), name: g.name, qty: g.qty, price: e.share, assignedTo: [people[e.pi].id] }),
      );
    }
  }

  // The gap between the item shares and the grand total IS the tax and service.
  // Restoring it as a fixed amount is exact; the original split between the two
  // is not recorded anywhere in the payload, so it cannot be recovered.
  const subtotal = items.reduce((s, it) => s + it.price, 0);
  const fees = Math.round(((p.g as number) - subtotal) * 100) / 100;
  const payerIndex = typeof p.py === "number" ? p.py : -1;

  return {
    id: uid(),
    createdAt: when,
    updatedAt: when,
    title: (p.t as string) || "",
    currency: (p.c as string) || "IDR",
    source: "manual" as const,
    step: "breakdown" as const,
    people,
    items,
    charges:
      fees > 0.01
        ? { taxPct: fees, taxMode: "amt" as const, servicePct: 0, discount: 0 }
        : { taxPct: 0, servicePct: 0, discount: 0 },
    payerId: payerIndex >= 0 && people[payerIndex] ? people[payerIndex].id : null,
    paid: paidIdx.map((i) => people[i]?.id).filter(Boolean),
    summary: { grandTotal: (p.g as number) || 0 },
    shareId,
  };
}

const codeKey = (code: string) =>
  createHash("sha256").update("owe.user.v1::" + code).digest();

export const backupKey = (code: string) =>
  createHash("sha256").update(code).digest("hex");

interface UserPayload {
  history: ReturnType<typeof toDraft>[];
  owners: Record<string, string>;
  tombstones: Record<string, number>;
  contacts?: unknown[];
}

/* The admin can only read a device backup when the sync code is typed in --
   the server stores nothing but its hash. Reading it matters: writing a
   restore into a code the user already uses must not wipe the bills already
   in it. */
export function readUserPayload(data: string, code: string): UserPayload | null {
  try {
    const packed = Buffer.from(data, "base64");
    const d = createDecipheriv("aes-256-gcm", codeKey(code), packed.subarray(0, 12));
    d.setAuthTag(packed.subarray(packed.length - 16));
    const plain = Buffer.concat([
      d.update(packed.subarray(12, packed.length - 16)),
      d.final(),
    ]).toString("utf8");
    const parsed = JSON.parse(plain) as UserPayload;
    return Array.isArray(parsed?.history) ? parsed : null;
  } catch {
    return null;
  }
}

/** Encrypt a history for one sync code, exactly as the app would. */
export function buildRestore(
  rows: BillRow[],
  code: string,
  existing?: UserPayload | null,
): RestoreResult | null {
  const rebuilt: ReturnType<typeof toDraft>[] = [];
  const titles: string[] = [];

  rows.forEach((row, i) => {
    const p = readBillPayload(row.data);
    if (!p) return;
    const when = Date.parse(row.updated_at) || Date.now() - i * 60000;
    /* Who has settled lives in the bills row, not the blob: the blob is the
       snapshot taken when the link was made, and people paid after that. */
    let settled: number[] = [];
    try {
      const fromRow = JSON.parse(row.paid || "[]");
      settled = Array.isArray(fromRow) ? fromRow : [];
    } catch {
      settled = [];
    }
    if (!settled.length && Array.isArray(p.pd)) settled = p.pd as number[];
    const d = toDraft(p, row.id, when, settled);
    rebuilt.push(d);
    titles.push(d.title);
  });

  if (!rebuilt.length) return null;

  /* A bill already in the backup keeps its own entry: the device copy carries
     the draft the user has been editing, which is richer than anything that
     can be rebuilt from the shared snapshot. */
  const seen = new Set(
    (existing?.history ?? []).map((d) => d.shareId || d.id).filter(Boolean) as string[],
  );
  const merged = [
    ...rebuilt.filter((d) => !seen.has(d.shareId || d.id)),
    ...(existing?.history ?? []),
  ];

  const payload: UserPayload = {
    history: merged,
    owners: existing?.owners ?? {},
    tombstones: existing?.tombstones ?? {},
    ...(existing?.contacts ? { contacts: existing.contacts } : {}),
  };

  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", codeKey(code), iv);
  const body = Buffer.concat([
    c.update(Buffer.from(JSON.stringify(payload), "utf8")),
    c.final(),
  ]);

  return {
    key: backupKey(code),
    data: Buffer.concat([iv, body, c.getAuthTag()]).toString("base64"),
    titles,
  };
}

export const newSyncCode = (): string => randomUUID();
