export interface CurrencyDef {
  sym: string;
  code: string;
  dec: number;
  locale: string;
}

export type Rounding = "none" | "whole" | "up5" | "k";

export type StoredRate = { date: string | null; rates: Record<string, number>; at: number };

export type RateState =
  | { status: "same" }
  | { status: "loading" }
  | { status: "ready"; rate: number; date: string | null }
  | { status: "failed" };
