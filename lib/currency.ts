export interface CurrencyDef {
  sym: string;
  code: string;
  dec: number;
  locale: string;
}

export const CURRENCIES: Record<string, CurrencyDef> = {
  IDR: { sym: "Rp", code: "IDR", dec: 0, locale: "id-ID" },
  MYR: { sym: "RM", code: "MYR", dec: 2, locale: "ms-MY" },
  JPY: { sym: "¥", code: "JPY", dec: 0, locale: "ja-JP" },
  USD: { sym: "$", code: "USD", dec: 2, locale: "en-US" },
  SGD: { sym: "S$", code: "SGD", dec: 2, locale: "en-SG" },
  TWD: { sym: "NT$", code: "TWD", dec: 0, locale: "zh-TW" },
};

export function fmtMoney(
  amount: number,
  currencyCode = "USD",
  opts: { forceDec?: boolean } = {},
): string {
  const def = CURRENCIES[currencyCode] || CURRENCIES.USD;
  const safeAmount = isFinite(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat(def.locale, {
    minimumFractionDigits: opts.forceDec === false ? 0 : def.dec,
    maximumFractionDigits: def.dec,
  }).format(Math.abs(safeAmount));
  const sign = safeAmount < 0 ? "-" : "";
  const space = def.sym.length > 1 ? " " : "";
  return `${sign}${def.sym}${space}${formatted}`;
}

// Bare numeric amount — no currency symbol, no thousands separators — meant for
// pasting straight into a payment app's amount field. toFixed keeps "." as the
// decimal separator and never groups (e.g. 50000 for IDR, 12.50 for USD).
export function fmtAmountPlain(amount: number, currencyCode = "USD"): string {
  const def = CURRENCIES[currencyCode] || CURRENCIES.USD;
  const safeAmount = isFinite(amount) ? amount : 0;
  return safeAmount.toFixed(def.dec);
}
