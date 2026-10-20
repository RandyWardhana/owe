export type PayMethodKey =
  | "bank"
  | "gopay"
  | "ovo"
  | "dana"
  | "shopeepay"
  | "linkaja"
  | "paypal"
  | "other";

export interface Account {
  id: string;
  key: PayMethodKey;
  value: string;
}

export interface PayMethodDef {
  key: PayMethodKey;
  label: string;
  color: string;
}
