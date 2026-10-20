import type { ReactNode } from "react";

import type { AdminAccount, AdminObject, BackupSummary, BillSummary } from "../admin";

export type AdminTab = "bills" | "codes" | "receipts";

export type AdminGroup = "code" | "holder";

export type AdminPlace = { holder: string | null; device: string | null; group: AdminGroup };

export type CodeLookup = {
  exists: boolean;
  readable?: boolean;
  size?: number;
  updatedAt?: string | null;
  summary?: BackupSummary | null;
  linked?: boolean;
};

export interface HolderGroup {
  key: string;
  name: string;
  accounts: BillSummary["holder"]["accounts"];
  bills: BillSummary[];
  totals: Record<string, number>;
  last: string;
}

export interface DeviceGroup {
  key: string;
  updatedAt: string;
  size: number;
  bills: BillSummary[];
  name: string | null;
}

export type BillDevice = { key: string; name: string | null; updatedAt: string; bills: { id: string; title: string }[] };

export interface AdminBillProps {
  id: string;
}

export type ReceiptsView = "board" | "lost";

export interface ReceiptSlot {
  index: number;
  name: string;
  file: AdminObject | null;
  paid: boolean;
}

export interface ReceiptSlip {
  id: string;
  bill: BillSummary | undefined;
  files: AdminObject[];
  slots: ReceiptSlot[];
  latest: string;
}

export interface ReceiptPhotoProps {
  file: AdminObject;
  alt: string;
}

export interface ReceiptsProps {
  objects: AdminObject[] | null;
  billById: Map<string, BillSummary>;
  billHref: (id: string) => string;
  onRefresh: () => void;
  onDelete: (keys: string[]) => Promise<void>;
  onDeleteBill: (id: string) => Promise<boolean>;
}

export interface SyncIdProps {
  id: string;
  code?: string;
  className?: string;
}

export interface ChipProps {
  tone?: "neutral" | "pos" | "warn" | "bad" | "accent";
  children: ReactNode;
}

export interface AvatarProps {
  name: string;
  large?: boolean;
}

export interface PhoneIconProps {
  size?: number;
}

export interface AccountsProps {
  accounts: AdminAccount[];
  empty?: string;
}

export interface AdminCopyButtonProps {
  value: string;
  label?: string;
}

export interface NoticeProps {
  tone?: "info" | "bad" | "pos";
  children: ReactNode;
}

export interface GateProps {
  onSignedIn: () => void;
}

export type GiveResult = {
  ok?: boolean;
  code?: string;
  created?: boolean;
  titles?: string[];
  kept?: number;
  owned?: number;
  ownerFailed?: boolean;
  error?: string;
};

export interface GiveDialogProps {
  bills: { id: string; title: string }[];
  onClose: () => void;
  onDone?: () => void;
}
