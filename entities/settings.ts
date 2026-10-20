import type { Draft, ScanResult, SplitResult, Step } from "./bill";
import type { Rounding } from "./currency";

export type Theme = "light" | "dark";
export type Lang = "en" | "id";

export interface Toast {
  id: string;
  msg: string;
}

export interface AppState {
  theme: Theme;
  lang: Lang;
  accent: string;
  currency: string;
  rounding: Rounding;
  anim: boolean;
  // Display currency for shared bills (null = the bill's own); `currency` is for entering new bills.
  viewCurrency: string | null;

  history: Draft[];
  // id -> deletion time, so a sync cannot resurrect a deleted bill.
  tombstones: Record<string, number>;
  draft: Draft;

  view: Step;
  stack: Step[];
  dir: "fwd" | "back";

  toast: Toast | null;

  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setLang: (lang: Lang) => void;
  setAccent: (accent: string) => void;
  setCurrency: (currency: string) => void;
  setRounding: (rounding: Rounding) => void;
  setAnim: (anim: boolean) => void;
  setViewCurrency: (viewCurrency: string | null) => void;

  patchDraft: (patch: Partial<Draft>) => void;
  updateDraft: (fn: (draft: Draft) => Draft) => void;

  go: (step: Step) => void;
  editStep: (step: Step) => void;
  back: () => void;
  startNew: (step: Step) => void;
  resume: () => void;
  applyScan: (scan: ScanResult) => void;
  openHistory: (entry: Draft) => void;
  mergeHistory: (incoming: Draft[], incomingTombstones?: Record<string, number>) => void;
  deleteBillLocally: (id: string) => void;
  discardDraft: () => void;
  goHome: () => void;
  saveCurrent: (result: SplitResult, payerId: string | null) => void;
  finish: () => void;

  showToast: (msg: string) => void;
  clearToast: () => void;
}
