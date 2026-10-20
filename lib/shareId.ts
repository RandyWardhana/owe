import { isOwner } from "./billOwner";
import type { SharedBill } from "./types";

const PREFIX = "owe-";
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const ID_LENGTH = 12;
const UNBIASED_LIMIT = 256 - (256 % ALPHABET.length);

export function newShareId(): string {
  let id = "";
  while (id.length < ID_LENGTH) {
    for (const byte of crypto.getRandomValues(new Uint8Array(ID_LENGTH * 2))) {
      if (byte >= UNBIASED_LIMIT) continue;
      id += ALPHABET[byte % ALPHABET.length];
      if (id.length === ID_LENGTH) break;
    }
  }
  return PREFIX + id;
}

export function legacyShareId(bill: SharedBill): string {
  const signature = JSON.stringify([
    bill.title,
    bill.currency,
    bill.grandTotal,
    bill.people.map((person) => [person.name, person.total]),
  ]);
  let hash = 0;
  for (let i = 0; i < signature.length; i++) {
    hash = (hash * 31 + signature.charCodeAt(i)) | 0;
  }
  return PREFIX + (hash >>> 0).toString(36).padStart(6, "0");
}

export function resolveShareId(bill: SharedBill, existing?: string | null): string {
  if (existing) return existing;
  const legacy = legacyShareId(bill);
  return isOwner(legacy) ? legacy : newShareId();
}
