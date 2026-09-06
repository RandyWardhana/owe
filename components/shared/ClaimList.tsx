"use client";

import { useState } from "react";

import { useT } from "@/lib/i18n";
import { fmtMoney } from "@/lib/currency";
import { initials, personColor, personInk } from "@/lib/util";
import type { ClaimableItem, SharedBillPerson } from "@/lib/types";

import { Check, Plus, X } from "@/components/icons";

interface Props {
  items: ClaimableItem[];
  people: SharedBillPerson[];
  claims: Record<string, number>;
  currency: string;
  feeRate: number;
  paid: Set<number>;
  onClaim: (itemId: string, person: number | null) => void;
}

/* Items the maker could not attribute at the table. Nobody is charged for them
   until someone puts their name on one, which is why an unclaimed row shows the
   bare price and a claimed one shows what it actually costs that person. */
export default function ClaimList({
  items,
  people,
  claims,
  currency,
  feeRate,
  paid,
  onClaim,
}: Props) {
  const t = useT();
  const [picking, setPicking] = useState<string | null>(null);

  if (!items.length) return null;

  const open = items.filter((item) => claims[item.id] === undefined).length;

  return (
    <>
      <p className="label" style={{ marginTop: 24 }}>
        {t("shared.claimTitle")}
      </p>
      <p className="muted assign-hint" style={{ marginTop: -4 }}>
        {open ? t("shared.claimHint", { n: open }) : t("shared.claimAllDone")}
      </p>

      <div className="col-gap">
        {items.map((item) => {
          const who = claims[item.id];
          const holder = who === undefined ? null : people[who];
          const locked = who !== undefined && paid.has(who);
          const cost = item.amount * (1 + feeRate);

          return (
            <div key={item.id} className={`card claim ${holder ? "is-taken" : ""}`}>
              <div className="claim__row">
                <div className="claim__what">
                  <div className="claim__name">
                    {item.qty > 1 ? `${item.qty}x ` : ""}
                    {item.name || t("shared.claimUntitled")}
                  </div>
                  <div className="muted claim__price">
                    {holder
                      ? t("shared.claimCosts", { amount: fmtMoney(cost, currency) })
                      : fmtMoney(item.amount, currency)}
                  </div>
                </div>

                {holder ? (
                  <button
                    type="button"
                    className="claim__holder"
                    disabled={locked}
                    onClick={() => onClaim(item.id, null)}
                    aria-label={t("shared.claimRelease", { name: holder.name || "—" })}
                  >
                    <span
                      className="avatar claim__av"
                      style={{
                        background: personColor(who),
                        color: personInk(who),
                      }}
                    >
                      {initials(holder.name)}
                    </span>
                    <span className="claim__holdername">{holder.name || "—"}</span>
                    {locked ? <Check size={14} /> : <X size={14} />}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="claim__take"
                    onClick={() => setPicking(picking === item.id ? null : item.id)}
                    aria-expanded={picking === item.id}
                  >
                    <Plus size={15} /> {t("shared.claimMine")}
                  </button>
                )}
              </div>

              {picking === item.id ? (
                <div className="claim__pick">
                  <span className="muted claim__picklabel">{t("shared.claimWho")}</span>
                  <div className="claim__faces">
                    {people.map((person, i) => (
                      <button
                        key={i}
                        type="button"
                        className="claim__face"
                        onClick={() => {
                          setPicking(null);
                          onClaim(item.id, i);
                        }}
                      >
                        <span
                          className="avatar claim__av"
                          style={{ background: personColor(i), color: personInk(i) }}
                        >
                          {initials(person.name)}
                        </span>
                        <span className="claim__facename">{person.name || "—"}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
