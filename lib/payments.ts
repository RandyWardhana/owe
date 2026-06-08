import type { PayMethodKey } from "./types";

export interface PayMethodDef {
  key: PayMethodKey;
  label: string;
  color: string;
}

export const PAY_METHODS: PayMethodDef[] = [
  { key: "bank", label: "Bank transfer", color: "#0ea5e9" },
  { key: "gopay", label: "GoPay", color: "#00AAD2" },
  { key: "ovo", label: "OVO", color: "#4C2A86" },
  { key: "dana", label: "DANA", color: "#118EEA" },
  { key: "shopeepay", label: "ShopeePay", color: "#EE4D2D" },
  { key: "linkaja", label: "LinkAja", color: "#E11900" },
  { key: "paypal", label: "PayPal", color: "#1D3A8A" },
  { key: "other", label: "Other", color: "#64748b" },
];

export const methodMeta = (key: PayMethodKey): PayMethodDef =>
  PAY_METHODS.find((m) => m.key === key) || PAY_METHODS[PAY_METHODS.length - 1];
