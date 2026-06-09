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
}
