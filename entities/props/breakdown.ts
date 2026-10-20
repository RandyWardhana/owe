import type { Person, PersonSplit, Settlement, SplitResult } from "../bill";

export interface PerPersonListProps {
  perPerson: PersonSplit[];
  people: Person[];
  payer: Person | null;
  currency: string;
}

export interface PersonCardProps {
  person: PersonSplit;
  colorIndex: number;
  animIndex: number;
  currency: string;
  isPayer: boolean;
}

export interface SettleUpProps {
  people: Person[];
  payer: Person | null;
  payerId: string | null;
  settle: Settlement[];
  paid: string[];
  currency: string;
  summary: string;
  onSetPayer: (id: string) => void;
  onTogglePaid: (id: string) => void;
  proofOf?: (personId: string) => string | null;
  onViewProof?: (personId: string) => void;
}

export interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  link: string;
  label: string;
  summary: string;
}

export interface TotalCardProps {
  result: SplitResult;
  currency: string;
}
