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

export const NO_HOLDER = "no-holder";

export interface AdminDevice {
  key: string;
  size: number;
  updatedAt: string;
  billIds: string[];
  name: string | null;
}
