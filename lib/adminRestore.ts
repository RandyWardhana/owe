import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";

import { readSharedBill } from "./adminDb";
import type {
  AdminBillRow,
  BackupPayload,
  BackupSummary,
  RestoredDraft,
  RestoreResult,
} from "../entities/admin";
import type { SharedBill } from "../entities/share";

// A shared bill records each person's share of each item with tax and service folded into
// their totals but not the shares, so rebuilding a draft must add the fees back.

const uid = () => randomUUID().slice(0, 7);

const codeKey = (code: string) =>
  createHash("sha256").update("owe.user.v1::" + code).digest();

function toDraft(bill: SharedBill, shareId: string, when: number, paidIndices: number[]): RestoredDraft {
  const people = bill.people.map((person) => ({
    id: uid(),
    name: person.name || "",
    accounts: person.accounts.map((account) => ({ id: uid(), key: account.key, value: account.value })),
  }));

  const groups = new Map<
    string,
    { name: string; qty: number; entries: { personIndex: number; share: number }[] }
  >();
  bill.people.forEach((person, personIndex) => {
    person.items.forEach((item) => {
      const groupKey = `${item.name}::${item.split || 1}`;
      if (!groups.has(groupKey)) groups.set(groupKey, { name: item.name, qty: item.qty || 1, entries: [] });
      groups.get(groupKey)!.entries.push({ personIndex, share: item.share || 0 });
    });
  });

  const items: { id: string; name: string; qty: number; price: number; assignedTo: string[] }[] = [];
  for (const group of groups.values()) {
    const equal = group.entries.every((entry) => Math.abs(entry.share - group.entries[0].share) < 0.01);
    if (equal && group.entries.length > 1) {
      items.push({
        id: uid(),
        name: group.name,
        qty: group.qty,
        price: group.entries.reduce((sum, entry) => sum + entry.share, 0),
        assignedTo: group.entries.map((entry) => people[entry.personIndex].id),
      });
    } else {
      group.entries.forEach((entry) =>
        items.push({
          id: uid(),
          name: group.name,
          qty: group.qty,
          price: entry.share,
          assignedTo: [people[entry.personIndex].id],
        }),
      );
    }
  }

  // The gap between item shares and grand total is tax plus service. Restored as one fixed
  // amount, because the payload does not record how it split between the two.
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const fees = Math.round((bill.grandTotal - subtotal) * 100) / 100;
  const payerIndex = typeof bill.payerIndex === "number" ? bill.payerIndex : -1;

  return {
    id: uid(),
    createdAt: when,
    updatedAt: when,
    title: bill.title || "",
    currency: bill.currency || "IDR",
    source: "manual" as const,
    step: "breakdown" as const,
    people,
    items,
    charges:
      fees > 0.01
        ? { taxPct: fees, taxMode: "amt" as const, servicePct: 0, discount: 0 }
        : { taxPct: 0, servicePct: 0, discount: 0 },
    payerId: payerIndex >= 0 && people[payerIndex] ? people[payerIndex].id : null,
    paid: paidIndices.map((index) => people[index]?.id).filter(Boolean),
    summary: { grandTotal: bill.grandTotal || 0 },
    shareId,
  };
}

export const backupKey = (code: string) =>
  createHash("sha256").update(code).digest("hex");

// Readable only with the typed sync code; the server stores just its hash. Read before a
// restore so writing into a code already in use does not wipe its bills.
export function readUserPayload(data: string, code: string): BackupPayload | null {
  try {
    const packed = Buffer.from(data, "base64");
    const decipher = createDecipheriv("aes-256-gcm", codeKey(code), packed.subarray(0, 12));
    decipher.setAuthTag(packed.subarray(packed.length - 16));
    const plain = Buffer.concat([
      decipher.update(packed.subarray(12, packed.length - 16)),
      decipher.final(),
    ]).toString("utf8");
    const parsed = JSON.parse(plain) as BackupPayload;
    return Array.isArray(parsed?.history) ? parsed : null;
  } catch {
    return null;
  }
}

/** Encrypts a history for one sync code exactly as the app would. */
export function buildRestore(
  rows: AdminBillRow[],
  code: string,
  existing?: BackupPayload | null,
  owners: Record<string, string> = {},
): RestoreResult | null {
  const rebuilt: RestoredDraft[] = [];
  const titles: string[] = [];

  rows.forEach((row, index) => {
    const bill = readSharedBill(row.data);
    if (!bill) return;
    const when = Date.parse(row.updated_at) || Date.now() - index * 60000;
    // Settled state lives in the row: the blob is a snapshot from when the link was made.
    let settled: number[] = [];
    try {
      const fromRow = JSON.parse(row.paid || "[]");
      settled = Array.isArray(fromRow) ? fromRow : [];
    } catch {
      settled = [];
    }
    if (!settled.length) settled = bill.paidIndices;
    const draft = toDraft(bill, row.id, when, settled);
    rebuilt.push(draft);
    titles.push(draft.title);
  });

  if (!rebuilt.length) return null;

  // A bill already in the backup keeps its device copy, which is richer than a rebuild.
  const seen = new Set(
    (existing?.history ?? []).map((draft) => draft.shareId || draft.id).filter(Boolean) as string[],
  );
  const merged = [
    ...rebuilt.filter((draft) => !seen.has(draft.shareId || draft.id)),
    ...(existing?.history ?? []),
  ];

  const payload: BackupPayload = {
    history: merged,
    owners: { ...(existing?.owners ?? {}), ...owners },
    tombstones: existing?.tombstones ?? {},
    ...(existing?.contacts ? { contacts: existing.contacts } : {}),
    ...(existing?.name ? { name: existing.name } : {}),
  };

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", codeKey(code), iv);
  const body = Buffer.concat([
    cipher.update(Buffer.from(JSON.stringify(payload), "utf8")),
    cipher.final(),
  ]);

  return {
    key: backupKey(code),
    data: Buffer.concat([iv, body, cipher.getAuthTag()]).toString("base64"),
    titles,
    billIds: [...new Set(merged.map((draft) => draft.shareId).filter((id): id is string => Boolean(id)))],
  };
}

export const newSyncCode = (): string => randomUUID();

export const newOwnerToken = (): string => randomUUID();

export const ownerHashOf = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

export function summarizeUserPayload(payload: BackupPayload): BackupSummary {
  const owners = payload.owners ?? {};
  return {
    name: typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : null,
    bills: payload.history.map((draft) => {
      const entry = draft as Partial<RestoredDraft> & { id: string };
      const shareId = entry.shareId || null;
      return {
        id: entry.id,
        shareId,
        title: entry.title || "(untitled)",
        currency: entry.currency || "",
        total: entry.summary?.grandTotal ?? 0,
        people: Array.isArray(entry.people) ? entry.people.length : 0,
        updatedAt: entry.updatedAt || entry.createdAt || 0,
        owner: Boolean(shareId && owners[shareId]),
      };
    }),
    contacts: Array.isArray(payload.contacts) ? payload.contacts.length : 0,
    deleted: Object.keys(payload.tombstones ?? {}).length,
  };
}
