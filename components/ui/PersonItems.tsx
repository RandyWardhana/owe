"use client";

import { fmtMoney } from "@/lib/currency";
import { useT } from "@/lib/i18n";

export default function PersonItems({
  items,
  currency,
}: {
  items: { name: string; qty: number; share: number; split?: number; units?: number }[];
  currency: string;
}) {
  const t = useT();
  if (!items.length) return null;
  return (
    <div className="pp__items">
      {items.map((item, index) => (
        <div className="pp__item" key={index}>
          <span className="pp__item-label">
            <span className="pp__item-name truncate">
              {/* Only prefix the quantity for items this person had to
                  themselves. Shared items show just the name — the full line
                  qty (e.g. "6×") is misleading on a single person's share,
                  unless they were counted for more than one of it. */}
              {item.units && item.units > 1
                ? `${item.units}× `
                : !item.split && item.qty > 1
                  ? `${item.qty}× `
                  : ""}
              {item.name || "—"}
            </span>
            {item.split && !item.units ? (
              <span className="badge-shared">{t("assign.shared")}</span>
            ) : null}
          </span>
          <span className="pp__item-amt tnum">
            {fmtMoney(item.share, currency)}
          </span>
        </div>
      ))}
    </div>
  );
}
