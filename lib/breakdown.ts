import { settlements } from "./calc";
import { fmtMoney } from "./currency";
import { maskedOf } from "./mask";
import { methodMeta } from "./payments";
import type { TFn } from "./i18n";
import type { Person, PersonSplit, SharedBill, SplitResult } from "./types";

export function buildSharedBill(
  title: string,
  result: SplitResult,
  people: Person[],
  payerId: string | null,
  currency: string,
  paid: string[],
): SharedBill {
  const ids = people.map((person) => person.id);
  const paidIndices: number[] = [];
  result.perPerson.forEach((split, index) => {
    if (paid.includes(split.id)) paidIndices.push(index);
  });

  return {
    version: 1,
    title,
    currency,
    grandTotal: result.grandTotal,
    payerIndex: payerId ? ids.indexOf(payerId) : -1,
    people: result.perPerson.map((split) => {
      const person = people.find((candidate) => candidate.id === split.id);
      return {
        name: split.name,
        total: split.total,
        accounts: (person?.accounts || []).map((account) => ({
          key: account.key,
          value: account.value,
          masked: maskedOf(account),
        })),
        items: split.items.map((item) => ({
          name: item.name,
          qty: item.qty,
          share: item.share,
          // Only carry the split count when shared; keeps exclusive-item
          // entries compact in the URL.
          ...(item.split ? { split: item.split } : {}),
        })),
      };
    }),
    paidIndices,
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
