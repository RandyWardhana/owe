import type {
  Draft,
  Item,
  PersonSplit,
  Rounding,
  Settlement,
  SplitResult,
} from "./types";

export function lineTotal(it: Pick<Item, "qty" | "price">): number {
  return (Number(it.qty) || 0) * (Number(it.price) || 0);
}

export function roundVal(v: number, mode: Rounding): number {
  if (mode === "whole") return Math.round(v);
  if (mode === "up5") return Math.ceil(v / 5) * 5;
  if (mode === "k") return Math.round(v / 1000) * 1000;
  return Math.round(v * 100) / 100;
}

export function computeSplit(
  state: Pick<Draft, "items" | "people" | "charges">,
  { rounding = "none" as Rounding } = {},
): SplitResult {
  const { items = [], people = [], charges } = state;
  const taxVal = Number(charges?.taxPct) || 0;
  const serviceVal = Number(charges?.servicePct) || 0;
  const discount = Number(charges?.discount) || 0;

  const itemsSubtotal = items.reduce((s, it) => s + lineTotal(it), 0);

  const base: Record<string, { subtotal: number; items: PersonSplit["items"] }> =
    {};
  people.forEach((p) => {
    base[p.id] = { subtotal: 0, items: [] };
  });
  let unassignedSubtotal = 0;
  const unassignedItems: Item[] = [];

  items.forEach((it) => {
    const lt = lineTotal(it);
    const who = (it.assignedTo || []).filter((id) => base[id]);
    if (!who.length) {
      unassignedSubtotal += lt;
      if (lt > 0 || it.name) unassignedItems.push(it);
      return;
    }
    const share = lt / who.length;
    who.forEach((id) => {
      base[id].subtotal += share;
      base[id].items.push({
        name: it.name,
        qty: it.qty,
        share,
        split: who.length > 1 ? who.length : 0,
      });
    });
  });

  const assignedSubtotal = people.reduce((s, p) => s + base[p.id].subtotal, 0);

  const tax =
    charges?.taxMode === "amt" ? taxVal : (itemsSubtotal * taxVal) / 100;
  const service =
    charges?.serviceMode === "amt"
      ? serviceVal
      : (itemsSubtotal * serviceVal) / 100;
  const grandTotal = itemsSubtotal + tax + service - discount;

  const perPerson: PersonSplit[] = people.map((p) => {
    const sub = base[p.id].subtotal;
    const frac = assignedSubtotal > 0 ? sub / assignedSubtotal : 0;
    const t = tax * frac;
    const sv = service * frac;
    const d = discount * frac;
    const total = sub + t + sv - d;
    return {
      id: p.id,
      name: p.name,
      subtotal: sub,
      tax: t,
      service: sv,
      discount: d,
      total: roundVal(total, rounding),
      rawTotal: total,
      items: base[p.id].items,
    };
  });

  return {
    itemsSubtotal,
    assignedSubtotal,
    unassignedSubtotal,
    unassignedItems,
    tax,
    service,
    discount,
    grandTotal,
    perPerson,
  };
}

export function settlements(
  perPerson: PersonSplit[],
  payerId: string | null,
): Settlement[] {
  return perPerson
    .filter((p) => p.id !== payerId && p.total > 0.0001)
    .map((p) => ({
      from: p.id,
      fromName: p.name,
      to: payerId as string,
      amount: p.total,
    }));
}
