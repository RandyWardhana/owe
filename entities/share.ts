import type { PayMethodKey } from "./payment";
import type { RemoveResult, UploadResult } from "./proof";

/**
 * Compact on-the-wire shape for a shared bill. The single-character keys are
 * intentional: this gets JSON-encoded into the share URL, so short keys keep
 * links small. Do NOT rename these — it would break existing links and bloat
 * new ones. Map to/from the readable `SharedBill` (below) at the encode/decode
 * boundary in lib/share.ts instead. Key legend:
 *   v=version, t=title, c=currency, g=grandTotal, py=payerIndex, pd=paidIndices
 *   pp=people [ n=name, t=total, ac=accounts[k=key, v=value],
 *               it=items[n=name, q=qty, s=share, sp=split, u=units] ]
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
    it?: { n: string; q: number; s: number; sp?: number; u?: number }[];
  }[];

  pd?: number[];

  // Absent on older links, so every reader must treat them as optional.
  ui?: { i: string; n: string; q: number; a: number }[];
  fr?: number;
}

export interface SharedBillItem {
  name: string;
  qty: number;
  share: number;
  split?: number;
  // How many of a shared line this person had, when it was not one each.
  units?: number;
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
  // A claimed amount costs its claimer amount x (1 + feeRate), the same footing as assigned items.
  feeRate: number;
}

export type SharedState = SharedBill | null | undefined;

export type Claims = Record<string, number[]>;

export type StoredBill = { data: string | null; paid: number[]; claims: Claims };

export type BillMissing =
  | "no-cloud" // this build was made without NEXT_PUBLIC_OWE_CLOUD
  | "offline"
  | "no-db" // the server has no OWE_DB_URL / OWE_DB_SECRET
  | "db-unreachable" // the server could not reach the owe-db Worker
  | "server" // /api/bill itself failed
  | "not-found" // the server answered, and there is no bill under that id
  | "unreadable"; // there is a bill, but it would not decrypt

export interface SettlementState {
  paid: Set<number>;
  proofs: Set<number>;
  isOwner: boolean;
  uploading: number | null;
  /** itemId -> the people who put their names on it. */
  claims: Claims;
  claimedTotals: number[];
  claim: (itemId: string, person: number, on: boolean) => Promise<boolean>;
  /** Owner only. No-ops for a guest, who has no token to send. */
  confirm: (index: number) => void;
  submitProof: (index: number, file: File) => Promise<UploadResult>;
  /** Refused once the line is confirmed, unless owner. */
  dropProof: (index: number) => Promise<RemoveResult>;
}

export interface OwnerSettlement {
  paidIds: string[];
  togglePaid: (personId: string) => void;
  proofFor: (personId: string) => string | null;
  hasProofFor: (personId: string) => boolean;
  /** itemId -> ids of the people who claimed it, from the shared link. */
  claimedBy: Record<string, string[]>;
  releaseClaim: (itemId: string) => void;
}
