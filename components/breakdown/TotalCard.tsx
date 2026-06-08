"use client";

import { useT } from "@/lib/i18n";
import { fmtMoney } from "@/lib/currency";
import type { SplitResult } from "@/lib/types";

import AnimatedMoney from "@/components/ui/AnimatedMoney";

export default function TotalCard({
  result,
  currency,
}: {
  result: SplitResult;
  currency: string;
}) {
  const t = useT();

  const sub: string[] = [
    t("breakdown.items", { amount: fmtMoney(result.itemsSubtotal, currency) }),
  ];
  if (result.tax > 0) sub.push(t("breakdown.plusTax", { amount: fmtMoney(result.tax, currency) }));
  if (result.service > 0)
    sub.push(t("breakdown.plusService", { amount: fmtMoney(result.service, currency) }));
  if (result.discount > 0)
    sub.push(t("breakdown.minusDiscount", { amount: fmtMoney(result.discount, currency) }));

  return (
    <>
      <div className="card hero-total rise">
        <div className="label" style={{ margin: 0 }}>
          {t("breakdown.totalBill")}
        </div>
        <div className="grand disp tnum">
          <AnimatedMoney value={result.grandTotal} currency={currency} />
        </div>
        <div className="muted grand__sub">{sub.join("")}</div>
      </div>

      {result.unassignedSubtotal > 0 ? (
        <div className="banner warn-banner">
          {t("breakdown.unassigned", {
            amount: fmtMoney(result.unassignedSubtotal, currency),
          })}
        </div>
      ) : null}
    </>
  );
}
