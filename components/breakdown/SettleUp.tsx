"use client";

import { useT } from "@/lib/i18n";
import { useCopyAnim } from "@/lib/hooks";
import { initials, personColor, personInk } from "@/lib/util";

import { Check } from "@/components/icons";
import AnimatedMoney from "@/components/ui/AnimatedMoney";
import CopyTick from "@/components/ui/CopyTick";
import AccountRow from "@/components/ui/AccountRow";
import type { SettleUpProps } from "@/entities/props/breakdown";

export default function SettleUp({
  people,
  payer,
  payerId,
  settle,
  paid,
  currency,
  summary,
  onSetPayer,
  onTogglePaid,
  proofOf,
  onViewProof,
}: SettleUpProps) {
  const t = useT();
  const summaryCopy = useCopyAnim();
  const colorOf = (id: string) => people.findIndex((person) => person.id === id);

  return (
    <>
      <p className="label" style={{ marginTop: 26 }}>
        {t("breakdown.settleUp")}
      </p>
      <div className="card settle">
        <div className="settle__q dim">{t("breakdown.whoPaid")}</div>
        <div className="who" style={{ marginTop: 10 }}>
          {people.map((person) => {
            const on = person.id === payerId;
            const colorIndex = colorOf(person.id);
            return (
              <button
                key={person.id}
                className={`who__chip ${on ? "on" : ""}`}
                style={
                  on
                    ? { background: personColor(colorIndex), color: personInk(colorIndex), borderColor: "transparent" }
                    : undefined
                }
                onClick={() => onSetPayer(person.id)}
              >
                <span
                  className="avatar who__av"
                  style={{ background: personColor(colorIndex), color: personInk(colorIndex) }}
                >
                  {on ? <Check size={13} /> : initials(person.name)}
                </span>
                <span className="truncate">{person.name || "—"}</span>
              </button>
            );
          })}
        </div>

        {!payer || settle.length === 0 ? (
          <p className="muted settle__hint">{t("breakdown.coversOwn")}</p>
        ) : (
          <div className="col-gap" style={{ marginTop: 14 }}>
            {settle.map((settlement) => {
              const isPaid = paid.includes(settlement.from);
              const proof = proofOf?.(settlement.from) ?? null;
              return (
                <div className={`owe-row ${isPaid ? "is-paid" : ""}`} key={settlement.from}>
                  <button
                    className="owe-check"
                    aria-pressed={isPaid}
                    aria-label={t("breakdown.markPaid", { name: settlement.fromName || "—" })}
                    onClick={() => onTogglePaid(settlement.from)}
                  >
                    {isPaid ? <Check size={15} /> : null}
                  </button>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="owe-row__name truncate">{settlement.fromName || "—"}</div>
                    <div className="muted owe-row__sub">
                      {isPaid
                        ? t("breakdown.paid")
                        : proof
                          ? t("shared.proofWaiting")
                          : t("shared.owes", { name: payer.name || "—" })}
                    </div>
                  </div>
                  {proof ? (
                    <button
                      className="settle__thumb owe-row__proof"
                      onClick={() => onViewProof?.(settlement.from)}
                      aria-label={t("shared.viewProof")}
                    >
                      <img src={proof} alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                    </button>
                  ) : null}
                  <span className="owe-row__amt disp tnum">
                    <AnimatedMoney value={settlement.amount} currency={currency} />
                  </span>
                </div>
              );
            })}

            {payer.accounts.length ? (
              <div className="pay-via">
                <div className="label" style={{ margin: "4px 0 8px" }}>
                  {t("breakdown.payVia", { name: payer.name || "—" })}
                </div>
                {payer.accounts.map((account) => (
                  <AccountRow key={account.id} methodKey={account.key} value={account.value} />
                ))}
              </div>
            ) : null}

            <button
              className="btn ghost"
              onClick={() => summaryCopy.copy(summary)}
            >
              <CopyTick phase={summaryCopy.phase} size={16} />{" "}
              {t("breakdown.copyText")}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
