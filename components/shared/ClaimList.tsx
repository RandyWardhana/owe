"use client";

import { useT } from "@/lib/i18n";
import { fmtMoney } from "@/lib/currency";
import { initials, personColor, personInk } from "@/lib/util";

import { Check } from "@/components/icons";
import type { ClaimListProps } from "@/entities/props/shared";

/* Unattributed items are usually shared ones, so several people can toggle on
   and the cost divides between them, rather than a single "that's mine". */
export default function ClaimList({
  items,
  people,
  claims,
  currency,
  feeRate,
  paid,
  onClaim,
}: ClaimListProps) {
  const t = useT();
  if (!items.length) return null;

  const open = items.filter((item) => !(claims[item.id] ?? []).length).length;

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
          const holders = claims[item.id] ?? [];
          const locked = holders.some((who) => paid.has(who));
          const cost = item.amount * (1 + feeRate);
          const each = holders.length ? cost / holders.length : cost;

          return (
            <div key={item.id} className={`card claim ${holders.length ? "is-taken" : ""}`}>
              <div className="claim__head">
                <div className="claim__name">
                  {item.qty > 1 ? `${item.qty}x ` : ""}
                  {item.name || t("shared.claimUntitled")}
                </div>
                <div className="claim__price tnum">{fmtMoney(item.amount, currency)}</div>
              </div>

              <div className="claim__faces">
                {people.map((person, i) => {
                  const on = holders.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`claim__face ${on ? "is-on" : ""}`}
                      style={{
                        ["--tint" as string]: personColor(i),
                        ["--tint-ink" as string]: personInk(i),
                      }}
                      aria-pressed={on}
                      disabled={locked}
                      onClick={() => onClaim(item.id, i, !on)}
                      aria-label={`${on ? "Take" : "Put"} ${person.name || "—"} ${
                        on ? "off" : "on"
                      } ${item.name}`}
                    >
                      <span>{initials(person.name)}</span>
                      {on ? <Check size={11} className="claim__facecheck" /> : null}
                    </button>
                  );
                })}

                <span className="claim__each muted tnum">
                  {holders.length > 1
                    ? t("shared.claimEach", { amount: fmtMoney(each, currency) })
                    : holders.length === 1
                      ? t("shared.claimCosts", { amount: fmtMoney(cost, currency) })
                      : t("shared.claimNobody")}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
