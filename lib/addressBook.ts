import type { Account, Person } from "./types";
import { uid } from "./util";

/* Everyone you have split with before, and where to send them money.
   Device-local: this never leaves the browser and is not part of a shared bill.
   Keyed by the lower-cased name, because that is what the person typing
   actually matches on. */

const KEY = "owe.contacts.v1";
const LIMIT = 200;

export interface Contact {
  name: string;
  accounts: { key: Account["key"]; value: string }[];
  usedAt: number;
}

const normalize = (name: string): string => name.trim().toLowerCase();

function read(): Contact[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(contacts: Contact[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(contacts.slice(0, LIMIT)));
  } catch {
    // storage full or blocked; remembering a contact must never break a split
  }
}

/** Most recently used first — the order a picker should show them in. */
export function contacts(): Contact[] {
  return read().sort((a, b) => b.usedAt - a.usedAt);
}

/** Saved accounts for a name, ready to drop into a Person. */
export function accountsFor(name: string): Account[] {
  const key = normalize(name);
  if (!key) return [];

  const found = read().find((contact) => normalize(contact.name) === key);
  if (!found) return [];

  return found.accounts.map((account) => ({
    id: uid(),
    key: account.key,
    value: account.value,
  }));
}

export function isKnown(name: string): boolean {
  const key = normalize(name);
  return Boolean(key) && read().some((contact) => normalize(contact.name) === key);
}

/**
 * Remember these people for next time.
 *
 * Only those with a name AND at least one filled account are worth keeping —
 * a bare name saves nobody the question "where do I transfer?". A later bill
 * replaces the stored accounts, so correcting a number once fixes it for good.
 */
export function remember(people: Person[]): void {
  const existing = read();
  const now = Date.now();

  people.forEach((person) => {
    const name = person.name.trim();
    const accounts = person.accounts
      .filter((account) => account.value.trim())
      .map((account) => ({ key: account.key, value: account.value.trim() }));
    if (!name || !accounts.length) return;

    const at = existing.findIndex((c) => normalize(c.name) === normalize(name));
    const contact: Contact = { name, accounts, usedAt: now };
    if (at >= 0) existing[at] = contact;
    else existing.unshift(contact);
  });

  write(existing.sort((a, b) => b.usedAt - a.usedAt));
}

/**
 * Fold in the address book from another of your devices.
 *
 * Most recent write wins per person, so correcting someone's number on the
 * phone reaches the laptop rather than being overwritten by whatever the laptop
 * happened to remember. Nothing is ever removed by a merge: a contact missing
 * from the other device means it never saw them, not that they were deleted.
 */
export function mergeContacts(incoming: Contact[]): void {
  if (!Array.isArray(incoming) || incoming.length === 0) return;

  const byName = new Map<string, Contact>();
  for (const contact of [...read(), ...incoming]) {
    if (!contact?.name || !Array.isArray(contact.accounts)) continue;
    const key = normalize(contact.name);
    const held = byName.get(key);
    if (!held || (contact.usedAt || 0) > (held.usedAt || 0)) byName.set(key, contact);
  }

  write([...byName.values()].sort((a, b) => b.usedAt - a.usedAt));
}

export function forget(name: string): void {
  write(read().filter((contact) => normalize(contact.name) !== normalize(name)));
}
