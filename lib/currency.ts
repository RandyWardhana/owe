import type { CurrencyDef } from "../entities/currency";

// Order is the Settings list order. `dec` is how prices are counted in practice, not ISO's minor
// unit. MMK uses en-MM because my-MM prints Burmese digits. Every code must also be in the rates
// feed (app/api/rates), or "Show this bill in" cannot offer it.
export const CURRENCIES: Record<string, CurrencyDef> = {
  IDR: { sym: "Rp", code: "IDR", dec: 0, locale: "id-ID" },
  MYR: { sym: "RM", code: "MYR", dec: 2, locale: "ms-MY" },
  SGD: { sym: "S$", code: "SGD", dec: 2, locale: "en-SG" },
  THB: { sym: "฿", code: "THB", dec: 2, locale: "th-TH" },
  PHP: { sym: "₱", code: "PHP", dec: 2, locale: "en-PH" },
  VND: { sym: "₫", code: "VND", dec: 0, locale: "vi-VN" },
  BND: { sym: "B$", code: "BND", dec: 2, locale: "ms-BN" },
  KHR: { sym: "៛", code: "KHR", dec: 0, locale: "km-KH" },
  LAK: { sym: "₭", code: "LAK", dec: 0, locale: "lo-LA" },
  MMK: { sym: "Ks", code: "MMK", dec: 0, locale: "en-MM" },
  USD: { sym: "$", code: "USD", dec: 2, locale: "en-US" },
  JPY: { sym: "¥", code: "JPY", dec: 0, locale: "ja-JP" },
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

/** No symbol or grouping, for pasting into a payment app's amount field (50000, 12.50). */
export function fmtAmountPlain(amount: number, currencyCode = "USD"): string {
  const def = CURRENCIES[currencyCode] || CURRENCIES.USD;
  const safeAmount = isFinite(amount) ? amount : 0;
  return safeAmount.toFixed(def.dec);
}
