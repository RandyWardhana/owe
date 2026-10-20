import { computeSplit, lineTotal } from "./calc";
import type { Draft } from "../entities/bill";
import type { Rounding } from "../entities/currency";
import type { TFn } from "../entities/i18n";
import type { Receipt, ReceiptCharge, ReceiptLine, ReceiptStatus, ReceiptStub } from "../entities/receipt";
import type { SharedBill } from "../entities/share";

const SAME_AMOUNT = 0.005;

function nonZero(charges: ReceiptCharge[]): ReceiptCharge[] {
  return charges.filter((charge) => Math.abs(charge.amount) > SAME_AMOUNT);
}

export function receiptFromDraft(draft: Draft, currency: string, rounding: Rounding = "none"): Receipt {
  const split = computeSplit(draft, { rounding });
  const colorOf = new Map(draft.people.map((person, index) => [person.id, index]));
  const nameOf = new Map(draft.people.map((person) => [person.id, person.name]));
  const paid = new Set(draft.paid ?? []);

  const lines: ReceiptLine[] = draft.items.map((item) => ({
    key: item.id,
    name: item.name,
    qty: item.qty,
    amount: lineTotal(item),
    people: item.assignedTo
      .filter((personId) => colorOf.has(personId))
      .map((personId) => ({ name: nameOf.get(personId) ?? "", colorIndex: colorOf.get(personId) ?? 0 })),
  }));

  const stubs: ReceiptStub[] = split.perPerson.map((person) => ({
    key: person.id,
    name: person.name,
    colorIndex: colorOf.get(person.id) ?? 0,
    amount: person.total,
    isPayer: person.id === draft.payerId,
    paid: person.id === draft.payerId || paid.has(person.id),
  }));

  return {
    id: draft.id,
    title: draft.title,
    date: draft.createdAt || null,
    currency: draft.currency || currency,
    lines,
    subtotal: split.itemsSubtotal,
    charges: nonZero([
      { key: "tax", amount: split.tax },
      { key: "service", amount: split.service },
      { key: "discount", amount: -split.discount },
    ]),
    total: split.grandTotal,
    payerName: draft.payerId ? (nameOf.get(draft.payerId) ?? null) : null,
    stubs,
  };
}

// A shared bill only records each person's share of each item, so lines are rebuilt from the
// shares; whatever the shares don't cover is fees. Links made
// without item detail have no lines, and then the total stands alone.
export function receiptFromShared(bill: SharedBill, paidIndices: number[] = bill.paidIndices): Receipt {
  const lines = new Map<string, ReceiptLine>();
  bill.people.forEach((person, personIndex) => {
    person.items.forEach((item) => {
      const qty = item.qty || 1;
      const shared = (item.split ?? 1) > 1;
      // A shared line is one item split between people; an unshared one with the same name and
      // price is separate orders of it, so those add up their quantities.
      const key = shared ? `shared::${item.name}::${item.split}::${qty}` : `own::${item.name}::${(item.share || 0) / qty}`;
      const line = lines.get(key) ?? { key, name: item.name, qty: shared ? qty : 0, amount: 0, people: [] };
      if (!shared) line.qty += qty;
      line.amount += item.share || 0;
      line.people.push({ name: person.name, colorIndex: personIndex });
      lines.set(key, line);
    });
  });
  bill.claimable.forEach((item) => {
    if (!lines.has(item.id)) {
      lines.set(item.id, { key: item.id, name: item.name, qty: item.qty || 1, amount: item.amount || 0, people: [] });
    }
  });

  const subtotal = [...lines.values()].reduce((sum, line) => sum + line.amount, 0);
  const paid = new Set(paidIndices);

  return {
    id: `shared:${bill.title}:${bill.grandTotal}`,
    title: bill.title,
    date: null,
    currency: bill.currency,
    lines: [...lines.values()],
    subtotal,
    charges: lines.size ? nonZero([{ key: "fees", amount: bill.grandTotal - subtotal }]) : [],
    total: bill.grandTotal,
    payerName: bill.people[bill.payerIndex]?.name ?? null,
    stubs: bill.people.map((person, index) => ({
      key: String(index),
      name: person.name,
      colorIndex: index,
      amount: person.total,
      isPayer: index === bill.payerIndex,
      paid: index === bill.payerIndex || paid.has(index),
    })),
  };
}

export function stillOwing(receipt: Receipt): number {
  return receipt.stubs.filter((stub) => !stub.paid && stub.amount > 0).length;
}

export function settleStatus(receipt: Receipt, t: TFn): ReceiptStatus | undefined {
  if (!receipt.stubs.some((stub) => !stub.isPayer && stub.amount > 0)) return undefined;
  const owing = stillOwing(receipt);
  if (!owing) return { tone: "settled", text: t("desk.receipt.settled") };
  return {
    tone: "owed",
    text: owing === 1 ? t("desk.receipt.stillOwesOne") : t("desk.receipt.stillOwe", { n: owing }),
  };
}
