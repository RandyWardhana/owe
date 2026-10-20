import type { ChargeMode } from "../bill";

export interface ChargeRowProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;

  mode?: ChargeMode;
  onModeChange?: (mode: ChargeMode) => void;
  sym?: string;
}

export interface QtyInputProps {
  value: number;
  onChange: (qty: number) => void;
}

export type ReorderDrag = { from: number; to: number; dy: number };
