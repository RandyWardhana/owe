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
}

export interface Person {
  id: string;
  name: string;
  accounts: Account[];
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

  /* Last time anything on this bill changed. createdAt cannot serve: it is set
     once, so two devices editing the same bill always tied and the merge kept
     whichever copy happened to be local. */
  updatedAt?: number;

  /* The id its share link points at. Minted once and then frozen: deriving it
     from the bill's contents meant every correction published a new link and
     abandoned the one already sent to everyone. */
  shareId?: string;
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
 *   pp=people [ n=name, t=total, ac=accounts[k=key, v=value],
 *               it=items[n=name, q=qty, s=share, sp=split] ]
 *   ui=unclaimed items [ i=id, n=name, q=qty, a=amount ], fr=fee rate
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
    ac: { k: PayMethodKey; v: string }[];
    it?: { n: string; q: number; s: number; sp?: number }[];
  }[];

  pd?: number[];

  /* Items the maker left for whoever ordered them to claim, and the rate that
     turns a claimed amount into what that person owes. Both absent on links
     made before claiming existed, which is why every reader treats them as
     optional rather than assuming a shape. */
  ui?: { i: string; n: string; q: number; a: number }[];
  fr?: number;
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
}

export interface SharedBillPerson {
  name: string;
  total: number;
  accounts: SharedBillAccount[];
  items: SharedBillItem[];
}

export interface ClaimableItem {
  id: string;
  name: string;
  qty: number;
  amount: number;
}

export interface SharedBill {
  version: number;
  title: string;
  currency: string;
  grandTotal: number;
  payerIndex: number;
  people: SharedBillPerson[];
  paidIndices: number[];
  claimable: ClaimableItem[];
  /* Multiply a claimed amount by (1 + feeRate) to get what it costs its
     claimer. Every person's total is already subtotal x (1 + feeRate), so a
     claim lands on exactly the same footing as an item assigned up front. */
  feeRate: number;
}
