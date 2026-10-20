import type { ReactNode } from "react";

import type { Draft } from "../bill";
import type { Receipt, ReceiptStatus } from "../receipt";

export interface ReceiptPatternProps {
  seed: string;
}

export interface ReceiptFrameProps {
  seed: string;
  heading: string;
  status?: ReceiptStatus;
  lead: ReactNode;
  note?: ReactNode;
  children: ReactNode;
}

export interface ReceiptFieldProps {
  label: string;
  children: ReactNode;
}

export interface ReceiptPaperProps {
  receipt: Receipt;
  heading: string;
  status?: ReceiptStatus;
  showStubs?: boolean;
  note?: ReactNode;
}

export interface SidebarProps {
  onOpenSettings: () => void;
}

export interface DeleteBillSheetProps {
  bill: Draft | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export interface BillDeletion {
  confirming: Draft | null;
  ask: (bill: Draft) => void;
  cancel: () => void;
  confirm: () => Promise<void>;
}
