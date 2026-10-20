export interface ReceiptPerson {
  name: string;
  colorIndex: number;
}

export interface ReceiptLine {
  key: string;
  name: string;
  qty: number;
  amount: number;
  people: ReceiptPerson[];
}

export interface ReceiptCharge {
  key: "tax" | "service" | "discount" | "fees";
  amount: number;
}

export interface ReceiptStub {
  key: string;
  name: string;
  colorIndex: number;
  amount: number;
  isPayer: boolean;
  paid: boolean;
}

export interface Receipt {
  id: string;
  title: string;
  date: number | null;
  currency: string;
  lines: ReceiptLine[];
  subtotal: number;
  charges: ReceiptCharge[];
  total: number;
  payerName: string | null;
  stubs: ReceiptStub[];
}

export type ReceiptStatusTone = "live" | "pending" | "settled" | "owed";

export interface ReceiptStatus {
  tone: ReceiptStatusTone;
  text: string;
}

export interface PatternWord {
  key: string;
  x: number;
  y: number;
  rotate: number;
  size: number;
  filled: boolean;
}
