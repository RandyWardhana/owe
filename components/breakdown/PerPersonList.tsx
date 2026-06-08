"use client";

import { useT } from "@/lib/i18n";
import { fmtMoney } from "@/lib/currency";
import { initials, personColor, personInk } from "@/lib/util";
import type { Person, PersonSplit } from "@/lib/types";

import AnimatedMoney from "@/components/ui/AnimatedMoney";

export default function PerPersonList({
  perPerson,
  people,
  currency,
}: {
  perPerson: PersonSplit[];
  people: Person[];
  currency: string;
}) {
  const t = useT();
  const colorOf = (id: string) => people.findIndex((p) => p.id === id);

  return (
    <>
      <p className="label" style={{ marginTop: 22 }}>
        {t("breakdown.perPerson")}
      </p>
      <div className="col-gap stagger">
        {perPerson.map((p, i) => {
          const ci = colorOf(p.id);
          const fees = p.tax + p.service - p.discount;
          return (
            <div className="card pp" key={p.id} style={{ ["--i" as string]: i }}>
              <div className="row between">
                <div className="row" style={{ gap: 11, minWidth: 0 }}>
                  <span
                    className="avatar pp__av"
                    style={{ background: personColor(ci), color: personInk(ci) }}
                  >
                    {initials(p.name)}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className="pp__name truncate">{p.name || "—"}</div>
                    <div className="muted pp__meta">
                      {p.items.length === 1
                        ? t("breakdown.itemOne")
                        : t("breakdown.itemsN", { n: p.items.length })}
                      {fees !== 0
                        ? t("breakdown.plusFees", { amount: fmtMoney(fees, currency) })
                        : ""}
                    </div>
                  </div>
                </div>
                <div className="pp__total disp tnum">
                  <AnimatedMoney value={p.total} currency={currency} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
