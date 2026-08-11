export type PayMethodKey =
  | "bank"
  | "gopay"
  | "ovo"
  | "dana"
  | "shopeepay"
  | "linkaja"
  | "paypal"
  | "other";

export interface Account {
  id: string;
  key: PayMethodKey;
  value: string;
  /** Display-only form of `value` (e.g. `••••7890`). Kept alongside the real
      value so screens can show the mask while copy hands over the full number.
      Optional: accounts saved before masking existed fall back to a derived
      mask (see lib/mask.ts). */
  masked?: string;
}

export interface Person {
  id: string;
  name: string;
  accounts: Account[];
}

/** A person owe remembers between bills, so re-adding them brings their
    payment details back. Matched by name (see lib/contacts.ts). */
export interface Contact {
  id: string;
  name: string;
  accounts: Account[];
  updatedAt: number;
}

export interface Item {
  id: string;
  name: string;
  qty: number;
  price: number;
  assignedTo: string[];
  _new?: boolean;
}

export type ChargeMode = "pct" | "amt";

export interface Charges {
  taxPct: number;
  servicePct: number;
  discount: number;
  taxMode?: ChargeMode;
  serviceMode?: ChargeMode;
}

export type ScanSource = "ocr" | "demo" | "partial" | "manual" | null;
export type Step = "home" | "scan" | "review" | "people" | "assign" | "breakdown";

export interface Draft {
  id: string;
  createdAt: number;
  title: string;
  items: Item[];
  people: Person[];
  charges: Charges;
  payerId: string | null;
  source: ScanSource;
  step: Step;
  currency?: string;
  summary?: { grandTotal: number };

  paid?: string[];
}

export interface ScanResult {
  items: { name: string; qty: number; price: number }[];
  charges: Charges;
  merchant?: string;
  currency?: string;
  source: ScanSource;
  rawText?: string;
  partialItems?: { name: string; qty: number; price: number }[];
}

export interface PersonSplit {
  id: string;
  name: string;
  subtotal: number;
  tax: number;
  service: number;
  discount: number;
  total: number;
  rawTotal: number;
  items: { name: string; qty: number; share: number; split: number }[];
}

export interface SplitResult {
  itemsSubtotal: number;
  assignedSubtotal: number;
  unassignedSubtotal: number;
  unassignedItems: Item[];
  tax: number;
  service: number;
  discount: number;
  grandTotal: number;
  perPerson: PersonSplit[];
}

export interface Settlement {
  from: string;
  fromName: string;
  to: string;
  amount: number;
}

export type Rounding = "none" | "whole" | "up5" | "k";
export type Theme = "light" | "dark";
export type Lang = "en" | "id";

/**
 * Compact on-the-wire shape for a shared bill. The single-character keys are
 * intentional: this gets JSON-encoded into the share URL, so short keys keep
 * links small. Do NOT rename these — it would break existing links and bloat
 * new ones. Map to/from the readable `SharedBill` (below) at the encode/decode
 * boundary in lib/share.ts instead. Key legend:
 *   v=version, t=title, c=currency, g=grandTotal, py=payerIndex, pd=paidIndices
 *   pp=people [ n=name, t=total, ac=accounts[k=key, v=value, m=maskedValue],
 *               it=items[n=name, q=qty, s=share, sp=split] ]
 */
export interface SharePayload {
  v: number;
  t: string;
  c: string;
  g: number;
  py: number;
  pp: {
    n: string;
    t: number;
    ac: { k: PayMethodKey; v: string; m?: string }[];
    it?: { n: string; q: number; s: number; sp?: number }[];
  }[];

  pd?: number[];
}

/* Readable shared-bill model used throughout the app. Mapped to/from the
   compact SharePayload wire format in lib/share.ts (toWire / fromWire). */
export interface SharedBillItem {
  name: string;
  qty: number;
  share: number;
  split?: number;
}

export interface SharedBillAccount {
  key: PayMethodKey;
  value: string;
  masked?: string;
}

export interface SharedBillPerson {
  name: string;
  total: number;
  accounts: SharedBillAccount[];
  items: SharedBillItem[];
}

export interface SharedBill {
  version: number;
  title: string;
  currency: string;
  grandTotal: number;
  payerIndex: number;
  people: SharedBillPerson[];
  paidIndices: number[];
}
