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
  n: number,
  cur = "USD",
  opts: { forceDec?: boolean } = {},
): string {
  const c = CURRENCIES[cur] || CURRENCIES.USD;
  const v = isFinite(n) ? n : 0;
  const s = new Intl.NumberFormat(c.locale, {
    minimumFractionDigits: opts.forceDec === false ? 0 : c.dec,
    maximumFractionDigits: c.dec,
  }).format(Math.abs(v));
  const sign = v < 0 ? "-" : "";
  const space = c.sym.length > 1 ? " " : "";
  return `${sign}${c.sym}${space}${s}`;
}
