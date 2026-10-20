import type { BillMissing, ClaimableItem, SharedBill, SharedBillPerson } from "../share";

export interface ClaimListProps {
  items: ClaimableItem[];
  people: SharedBillPerson[];
  claims: Record<string, number[]>;
  currency: string;
  feeRate: number;
  paid: Set<number>;
  onClaim: (itemId: string, person: number, on: boolean) => void;
}

export interface SharedMissingProps {
  reason: BillMissing;
  onMakeOwn: () => void;
}

export interface SharedPersonRowProps {
  person: SharedBillPerson;
  index: number;
  currency: string;
  // The total in the bill's own currency, when it is shown converted.
  original?: string;
  isPayer: boolean;
  isPaid: boolean;
  payerName: string;
  onToggle: () => void;
  copyText: string;
  isOwner?: boolean;
  hasProof?: boolean;
  uploading?: boolean;
  onProof?: (file: File) => void;
  onViewProof?: () => void;
  onRemoveProof?: () => void;
  proofSrc?: string;
}

export interface SharedViewProps {
  bill: SharedBill;
  shareId?: string | null;
  onMakeOwn: () => void;
}
