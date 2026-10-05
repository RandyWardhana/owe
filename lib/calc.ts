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

/* How many of the line this person had: at least 1, at most the line's qty. */
export function unitsOf(it: Pick<Item, "qty" | "units">, personId: string): number {
  const max = Math.max(1, Math.floor(Number(it.qty) || 1));
  const n = Math.floor(Number(it.units?.[personId]) || 1);
  return Math.min(max, Math.max(1, n));
}

export function roundVal(value: number, mode: Rounding): number {
  if (mode === "whole") return Math.round(value);
  if (mode === "up5") return Math.ceil(value / 5) * 5;
  if (mode === "k") return Math.round(value / 1000) * 1000;
  return Math.round(value * 100) / 100;
}

export function computeSplit(
  state: Pick<Draft, "items" | "people" | "charges">,
  { rounding = "none" as Rounding } = {},
): SplitResult {
  const { items = [], people = [], charges } = state;
  const taxVal = Number(charges?.taxPct) || 0;
  const serviceVal = Number(charges?.servicePct) || 0;
  const discount = Number(charges?.discount) || 0;

  const itemsSubtotal = items.reduce((sum, item) => sum + lineTotal(item), 0);

  const base: Record<string, { subtotal: number; items: PersonSplit["items"] }> =
    {};
  people.forEach((person) => {
    base[person.id] = { subtotal: 0, items: [] };
  });
  let unassignedSubtotal = 0;
  const unassignedItems: Item[] = [];

  items.forEach((item) => {
    const lineAmount = lineTotal(item);
    const assignees = (item.assignedTo || []).filter((id) => base[id]);
    if (!assignees.length) {
      unassignedSubtotal += lineAmount;
      if (lineAmount > 0 || item.name) unassignedItems.push(item);
      return;
    }
    /* Someone who had two of the six drinks pays for two: a line counted per
       person divides by units, not heads. A shared line, or one where every
       count is 1, is the plain even split. */
    const weights = assignees.map((id) => (item.countEach ? unitsOf(item, id) : 1));
    const totalUnits = weights.reduce((sum, w) => sum + w, 0);
    const uneven = weights.some((w) => w !== 1);
    assignees.forEach((id, index) => {
      const share = (lineAmount * weights[index]) / totalUnits;
      base[id].subtotal += share;
      base[id].items.push({
        name: item.name,
        qty: item.qty,
        share,
        split: assignees.length > 1 ? assignees.length : 0,
        ...(uneven && assignees.length > 1 ? { units: weights[index] } : {}),
      });
    });
  });

  const assignedSubtotal = people.reduce(
    (sum, person) => sum + base[person.id].subtotal,
    0,
  );

  const tax =
    charges?.taxMode === "amt" ? taxVal : (itemsSubtotal * taxVal) / 100;
  const service =
    charges?.serviceMode === "amt"
      ? serviceVal
      : (itemsSubtotal * serviceVal) / 100;
  const grandTotal = itemsSubtotal + tax + service - discount;

  const perPerson: PersonSplit[] = people.map((person) => {
    const subtotal = base[person.id].subtotal;
    /* Fees follow the items they were charged on, so an item nobody has taken
       carries its own tax and service until someone does. Dividing by the
       ASSIGNED subtotal instead spread the whole tax bill -- including the tax
       on items still unclaimed -- across whoever happened to be assigned, and
       then charged it a second time when the item was finally claimed. With
       every item assigned the two are identical. */
    const fraction = itemsSubtotal > 0 ? subtotal / itemsSubtotal : 0;
    const taxShare = tax * fraction;
    const serviceShare = service * fraction;
    const discountShare = discount * fraction;
    const total = subtotal + taxShare + serviceShare - discountShare;
    return {
      id: person.id,
      name: person.name,
      subtotal,
      tax: taxShare,
      service: serviceShare,
      discount: discountShare,
      total: roundVal(total, rounding),
      rawTotal: total,
      items: base[person.id].items,
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
    .filter((person) => person.id !== payerId && person.total > 0.0001)
    .map((person) => ({
      from: person.id,
      fromName: person.name,
      to: payerId as string,
      amount: person.total,
    }));
}
