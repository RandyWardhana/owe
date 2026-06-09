"use client";

import { useState } from "react";

import { useT } from "@/lib/i18n";
import { fmtMoney } from "@/lib/currency";
import { buildPersonText } from "@/lib/breakdown";
import { initials, personColor, personInk } from "@/lib/util";
import type { Person, PersonSplit } from "@/lib/types";

import { Chevron } from "@/components/icons";
import AnimatedMoney from "@/components/ui/AnimatedMoney";
import CopyButton from "@/components/ui/CopyButton";
import PersonItems from "@/components/ui/PersonItems";

export default function PersonCard({
  person,
  colorIndex,
  animIndex,
  payer,
  currency,
  isPayer,
}: {
  person: PersonSplit;
  colorIndex: number;
  animIndex: number;
  payer: Person | null;
  currency: string;
  isPayer: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);

  const fees = person.tax + person.service - person.discount;
  const hasItems = person.items.length > 0;
  const copyText = buildPersonText(t, person, payer, currency);

  return (
    <div
      className={`card pp ${isPayer ? "pp--payer" : ""}`}
      style={{ ["--i" as string]: animIndex }}
    >
      <div className="pp--row">
        <button
          className="pp__tap"
          onClick={() => hasItems && setOpen((o) => !o)}
          aria-expanded={hasItems ? open : undefined}
          aria-label={hasItems ? t("breakdown.viewItems", { name: person.name || "—" }) : undefined}
          disabled={!hasItems}
        >
          <div className="row between">
            <div className="row" style={{ gap: 11, minWidth: 0 }}>
              <span
                className="avatar pp__av"
                style={{ background: personColor(colorIndex), color: personInk(colorIndex) }}
              >
                {initials(person.name)}
              </span>
              <div style={{ minWidth: 0 }}>
                <div className="pp__name truncate">{person.name || "—"}</div>
                <div className="muted pp__meta">
                  {person.items.length === 1
                    ? t("breakdown.itemOne")
                    : t("breakdown.itemsN", { n: person.items.length })}
                  {fees !== 0
                    ? t("breakdown.plusFees", { amount: fmtMoney(fees, currency) })
                    : ""}
                </div>
              </div>
            </div>
            <div className="row pp__right">
              <div className="pp__total disp tnum">
                <AnimatedMoney value={person.total} currency={currency} />
              </div>
              {hasItems ? (
                <Chevron size={16} className={`pp__chev ${open ? "open" : ""}`} />
              ) : null}
            </div>
          </div>
        </button>
        <div className="pp__end">
          <CopyButton
            text={copyText}
            label={t("breakdown.copyShare", { name: person.name || "—" })}
          />
        </div>
      </div>

      {hasItems ? (
        <div className={`pp__drawer ${open ? "open" : ""}`}>
          <div>
            <PersonItems items={person.items} currency={currency} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
