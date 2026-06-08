import { settlements } from "./calc";
import { fmtMoney } from "./currency";
import { methodMeta } from "./payments";
import type { TFn } from "./i18n";
import type { Person, SharePayload, SplitResult } from "./types";

export function buildSharePayload(
  title: string,
  result: SplitResult,
  people: Person[],
  payerId: string | null,
  currency: string,
  paid: string[],
): SharePayload {
  const ids = people.map((p) => p.id);
  const pd: number[] = [];
  result.perPerson.forEach((ps, i) => {
    if (paid.includes(ps.id)) pd.push(i);
  });

  return {
    v: 1,
    t: title,
    c: currency,
    g: result.grandTotal,
    py: payerId ? ids.indexOf(payerId) : -1,
    pp: result.perPerson.map((ps) => {
      const person = people.find((p) => p.id === ps.id);
      return {
        n: ps.name,
        t: ps.total,
        ac: (person?.accounts || []).map((acc) => ({ k: acc.key, v: acc.value })),
      };
    }),
    pd,
  };
}

export function buildSummaryText(
  t: TFn,
  title: string,
  result: SplitResult,
  payer: Person | null,
  currency: string,
  paid: string[],
): string {
  const lines: string[] = [
    title || t("shared.defaultTitle"),
    `${t("breakdown.totalBill")}: ${fmtMoney(result.grandTotal, currency)}`,
    "",
  ];

  if (payer) {
    lines.push(t("breakdown.settleHeader", { name: payer.name || "—" }));
    settlements(result.perPerson, payer.id).forEach((s) => {
      const line = t("breakdown.owesLine", {
        from: s.fromName || "—",
        to: payer.name || "—",
        amount: fmtMoney(s.amount, currency),
      });
      lines.push(paid.includes(s.from) ? `✓ ${line} (${t("breakdown.paid")})` : line);
    });
    if (payer.accounts.length) {
      lines.push("", t("breakdown.payVia", { name: payer.name || "—" }));
      payer.accounts.forEach((a) => lines.push(`  ${methodMeta(a.key).label}: ${a.value}`));
    }
  } else {
    result.perPerson.forEach((p) =>
      lines.push(`${p.name || "—"}: ${fmtMoney(p.total, currency)}`),
    );
  }

  return lines.join("\n");
}
