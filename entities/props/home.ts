import type { Draft } from "../bill";

export interface HistoryRowProps {
  draft: Draft;
  index: number;
  currency: string;
  onOpen: () => void;
  onDelete: () => void;
}

export interface HomeProps {
  onOpenSettings: () => void;
}
