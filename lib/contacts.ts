import { hasSupabase } from "./supabase";
import { deviceId } from "./device";
import { withMask } from "./mask";
import { uid } from "./util";
import { decryptJSON, digestHex, encryptJSON, online } from "./vault";
import type { Account, Contact, Person } from "./types";

/* Saved people. Once someone is on a bill, owe remembers them so adding
   "Pak Arif" to the next split brings his bank / e-wallet details along.
   Local-first: the list lives in the persisted store, and — when cloud is
   configured — is mirrored encrypted to the same per-device row scheme as the
   bill history (see lib/vault.ts). */

const MAX_CONTACTS = 60;

/** People are matched by name, case- and spacing-insensitive. */
export const contactKey = (name: string): string =>
  (name || "").trim().toLowerCase().replace(/\s+/g, " ");

/** Fresh account ids, so copies on a new bill never share an id with the
    saved original (or with each other). */
export const cloneAccounts = (accounts: Account[]): Account[] =>
  accounts.map((account) => withMask({ ...account, id: uid() }));

export function findContact(contacts: Contact[], name: string): Contact | null {
  const key = contactKey(name);
  if (!key) return null;
  return contacts.find((c) => contactKey(c.name) === key) || null;
}

/**
 * Folds the people on a bill into the saved list. A later appearance updates
 * the name casing and the payment details — but a person added without any
 * accounts never wipes the ones we already remember for them.
 */
export function rememberInto(contacts: Contact[], people: Person[]): Contact[] {
  const byKey = new Map<string, Contact>();
  for (const contact of contacts) byKey.set(contactKey(contact.name), contact);

  let changed = false;
  const now = Date.now();

  for (const person of people) {
    const key = contactKey(person.name);
    if (!key) continue;

    const accounts = person.accounts.filter((a) => a.value.trim());
    const existing = byKey.get(key);
    const next: Contact = {
      id: existing?.id || uid(),
      name: person.name.trim(),
      accounts: accounts.length
        ? cloneAccounts(accounts)
        : existing?.accounts || [],
      updatedAt: now,
    };

    if (existing && sameContact(existing, next)) continue;
    byKey.set(key, next);
    changed = true;
  }

  if (!changed) return contacts;
  return Array.from(byKey.values())
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_CONTACTS);
}

/** Ignores ids and timestamps — only what the user would notice. */
function sameContact(a: Contact, b: Contact): boolean {
  return (
    a.name === b.name &&
    a.accounts.length === b.accounts.length &&
    a.accounts.every((account, i) => {
      const other = b.accounts[i];
      return other && account.key === other.key && account.value === other.value;
    })
  );
}

/** Merges a cloud copy into the local one, newest entry per name winning. */
export function mergeContactLists(local: Contact[], incoming: Contact[]): Contact[] {
  const byKey = new Map<string, Contact>();
  for (const contact of [...incoming, ...local]) {
    const key = contactKey(contact.name);
    if (!key) continue;
    const existing = byKey.get(key);
    if (!existing || (contact.updatedAt || 0) > (existing.updatedAt || 0)) {
      byKey.set(key, contact);
    }
  }
  return Array.from(byKey.values())
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, MAX_CONTACTS);
}

/* ---- Cloud mirror (optional, same device-keyed row scheme as the bills) --- */

export async function pullContacts(): Promise<Contact[] | null> {
  const id = deviceId();
  if (!hasSupabase || !id || !online()) return null;
  try {
    const key = await digestHex(id);
    const response = await fetch(
      `/api/sync?scope=contacts&key=${encodeURIComponent(key)}`,
    );
    if (!response.ok) return null;
    const json = (await response.json()) as { data?: string | null };
    if (!json.data) return null;
    const parsed = await decryptJSON<Contact[]>(json.data, id);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function pushContacts(contacts: Contact[]): Promise<void> {
  // as with the history: never overwrite a good backup with an empty list
  if (!contacts.length) return;
  const id = deviceId();
  if (!hasSupabase || !id || !online()) return;
  try {
    const key = await digestHex(id);
    const data = await encryptJSON(contacts, id);
    await fetch("/api/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scope: "contacts", key, data }),
    });
  } catch {
    /* best-effort */
  }
}
