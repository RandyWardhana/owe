import type { Charges, Person } from "./bill";

export interface AdminAccount {
  key: string;
  label: string;
  value: string;
}

export interface AdminHolder {
  key: string;
  name: string;
  accounts: AdminAccount[];
}

export interface AdminItem {
  name: string;
  qty: number;
  share: number;
  split?: number;
  units?: number;
}

export interface AdminProof {
  index: number;
  key: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

export interface AdminPerson {
  index: number;
  name: string;
  total: number;
  isPayer: boolean;
  paid: boolean;
  accounts: AdminAccount[];
  items: AdminItem[];
  claimed: { name: string; amount: number }[];
  proof: AdminProof | null;
}

export interface AdminClaimable {
  id: string;
  name: string;
  qty: number;
  amount: number;
  claimedBy: string[];
}

export interface BillSummary {
  id: string;
  title: string;
  currency: string;
  grandTotal: number;
  names: string[];
  payer: number;
  paid: number[];
  holder: AdminHolder;
  paidCount: number;
  proofs: number;
  unclaimed: number;
  owned: boolean;
  syncKey: string | null;
  updatedAt: string;
  readable: boolean;
}

export interface BillDetail extends BillSummary {
  people: AdminPerson[];
  claimable: AdminClaimable[];
  feeRate: number;
  raw: unknown;
}

export interface BackupBill {
  id: string;
  shareId: string | null;
  title: string;
  currency: string;
  total: number;
  people: number;
  updatedAt: number;
  owner: boolean;
}

export interface BackupSummary {
  name: string | null;
  bills: BackupBill[];
  contacts: number;
  deleted: number;
}

export interface AdminObject {
  key: string;
  size: number;
  uploaded: string;
  orphan: boolean;
  billId: string | null;
  personIndex: number | null;
  contentType: string | null;
}

export interface AdminDevice {
  key: string;
  size: number;
  updatedAt: string;
  billIds: string[];
  name: string | null;
}

export interface AdminBillRow {
  id: string;
  data: string | null;
  paid: string;
  claims?: string | null;
  updated_at: string;
  owned: number;
  sync_key?: string | null;
  proofs?: number;
}

export interface AdminProofRow {
  person_index: number;
  r2_key: string;
  content_type: string;
  size: number;
  uploaded_at: string;
}

export interface BackupRow {
  key: string;
  size: number;
  updated_at: string;
  bill_ids?: string | null;
  name?: string | null;
}

export interface RestoredDraft {
  id: string;
  createdAt: number;
  updatedAt: number;
  title: string;
  currency: string;
  source: "manual";
  step: "breakdown";
  people: Person[];
  items: { id: string; name: string; qty: number; price: number; assignedTo: string[] }[];
  charges: Charges;
  payerId: string | null;
  paid: (string | undefined)[];
  summary: { grandTotal: number };
  shareId: string;
}

export interface BackupPayload {
  history: RestoredDraft[];
  owners: Record<string, string>;
  tombstones: Record<string, number>;
  contacts?: unknown[];
  name?: string;
}

export interface RestoreResult {
  key: string;
  data: string;
  titles: string[];
  billIds: string[];
}
