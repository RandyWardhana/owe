"use client";

import { fmtMoney } from "@/lib/currency";

export default function PersonItems({
  items,
  currency,
}: {
  items: { name: string; qty: number; share: number }[];
  currency: string;
}) {
  if (!items.length) return null;
  return (
    <div className="pp__items">
      {items.map((it, k) => (
        <div className="pp__item" key={k}>
          <span className="pp__item-name truncate">
            {it.qty > 1 ? `${it.qty}× ` : ""}
            {it.name || "—"}
          </span>
          <span className="pp__item-amt tnum">
            {fmtMoney(it.share, currency)}
          </span>
        </div>
      ))}
    </div>
  );
}
