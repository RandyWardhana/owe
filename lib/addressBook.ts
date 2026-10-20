import type { Person } from "../entities/bill";
import type { Contact } from "../entities/contact";
import type { Account } from "../entities/payment";
import { uid } from "./util";

// Device-local: never leaves the browser and is not part of a shared bill.
// Keyed by lower-cased name, which is what the person typing matches on.

const KEY = "owe.contacts.v1";
const LIMIT = 200;

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

export function contacts(): Contact[] {
  return read().sort((a, b) => b.usedAt - a.usedAt);
}

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

/** Keeps only people with a name and a filled account; a later bill replaces stored accounts. */
export function remember(people: Person[]): void {
  const existing = read();
  const now = Date.now();

  people.forEach((person) => {
    const name = person.name.trim();
    const accounts = person.accounts
      .filter((account) => account.value.trim())
      .map((account) => ({ key: account.key, value: account.value.trim() }));
    if (!name || !accounts.length) return;

    const matchIndex = existing.findIndex((saved) => normalize(saved.name) === normalize(name));
    const contact: Contact = { name, accounts, usedAt: now };
    if (matchIndex >= 0) existing[matchIndex] = contact;
    else existing.unshift(contact);
  });

  write(existing.sort((a, b) => b.usedAt - a.usedAt));
}

/**
 * Most recent write wins per person. A merge never removes anything: a contact missing from
 * the other device means it never saw them, not that they were deleted.
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
