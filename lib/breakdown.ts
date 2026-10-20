import { lineTotal, settlements } from "./calc";
import { fmtMoney } from "./currency";
import { methodMeta } from "./payments";
import type { TFn } from "../entities/i18n";
import type { Person, SplitResult } from "../entities/bill";
import type { SharedBill } from "../entities/share";

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
        })),
        items: split.items.map((item) => ({
          name: item.name,
          qty: item.qty,
          share: item.share,
          ...(item.split ? { split: item.split } : {}),
          ...(item.units ? { units: item.units } : {}),
        })),
      };
    }),
    paidIndices,
    claimable: result.unassignedItems.map((item) => ({
      id: item.id,
      name: item.name,
      qty: item.qty,
      amount: lineTotal(item),
    })),
    feeRate:
      result.itemsSubtotal > 0
        ? (result.tax + result.service - result.discount) / result.itemsSubtotal
        : 0,
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
    settlements(result.perPerson, payer.id).forEach((settlement) => {
      const line = t("breakdown.owesLine", {
        from: settlement.fromName || "—",
        to: payer.name || "—",
        amount: fmtMoney(settlement.amount, currency),
      });
      lines.push(paid.includes(settlement.from) ? `✓ ${line} (${t("breakdown.paid")})` : line);
    });
    if (payer.accounts.length) {
      lines.push("", t("breakdown.payVia", { name: payer.name || "—" }));
      payer.accounts.forEach((account) => lines.push(`  ${methodMeta(account.key).label}: ${account.value}`));
    }
  } else {
    result.perPerson.forEach((person) =>
      lines.push(`${person.name || "—"}: ${fmtMoney(person.total, currency)}`),
    );
  }

  return lines.join("\n");
}
