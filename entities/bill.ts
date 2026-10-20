import type { Account } from "./payment";

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
  // Keyed by person id; absent or missing a person means 1. Only weights the split;
  // assignedTo still decides who is on the item.
  units?: Record<string, number>;
  // Off (default): an even split regardless of units. On: split by units.
  countEach?: boolean;
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

  // Drives the cross-device merge; createdAt is set once, so it cannot order edits.
  updatedAt?: number;

  // Minted once and frozen, so corrections keep the link already sent to everyone.
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
  items: { name: string; qty: number; share: number; split: number; units?: number }[];
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
