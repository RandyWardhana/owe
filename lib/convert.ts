import type { SharedBill } from "./types";

/* A shared bill with every amount multiplied into another currency, for
   reading only. Indices, ids and the fee rate (a ratio) are untouched, so the
   result lines up with claims and payments made against the original. */
export function convertBill(bill: SharedBill, rate: number, currency: string): SharedBill {
  if (rate === 1 && currency === bill.currency) return bill;
  return {
    ...bill,
    currency,
    grandTotal: bill.grandTotal * rate,
    people: bill.people.map((person) => ({
      ...person,
      total: person.total * rate,
      items: person.items.map((item) => ({ ...item, share: item.share * rate })),
    })),
    claimable: bill.claimable.map((item) => ({ ...item, amount: item.amount * rate })),
  };
}
