"use client";

import { fmtMoney } from "@/lib/currency";

export default function PersonItems({
  items,
  currency,
}: {
  items: { name: string; qty: number; share: number; split?: number }[];
  currency: string;
}) {
  if (!items.length) return null;
  return (
    <div className="pp__items">
      {items.map((item, index) => (
        <div className="pp__item" key={index}>
          <span className="pp__item-name truncate">
            {/* Only prefix the quantity for items this person had to
                themselves. Shared items show just the name — the full line
                qty (e.g. "6×") is misleading on a single person's share. */}
            {!item.split && item.qty > 1 ? `${item.qty}× ` : ""}
            {item.name || "—"}
          </span>
          <span className="pp__item-amt tnum">
            {fmtMoney(item.share, currency)}
          </span>
        </div>
      ))}
    </div>
  );
}
