import type { SharedBill } from "../entities/share";

/** For display only. Indices, ids and fee rate stay untouched so claims and payments still line up. */
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
