"use client";

import { useT } from "@/lib/i18n";
import { useCopyAnim } from "@/lib/hooks";
import { initials, personColor, personInk } from "@/lib/util";
import type { Person, Settlement } from "@/lib/types";

import { Check } from "@/components/icons";
import AnimatedMoney from "@/components/ui/AnimatedMoney";
import CopyTick from "@/components/ui/CopyTick";
import AccountRow from "@/components/ui/AccountRow";

interface Props {
  people: Person[];
  payer: Person | null;
  payerId: string | null;
  settle: Settlement[];
  paid: string[];
  currency: string;
  summary: string;
  onSetPayer: (id: string) => void;
  onTogglePaid: (id: string) => void;
  /* Receipts uploaded through the share link, by person id. Empty until the
     bill has been shared — an unshared split has nobody to upload one. */
  proofOf?: (personId: string) => string | null;
  onViewProof?: (personId: string) => void;
}

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
}: Props) {
  const t = useT();
  const summaryCopy = useCopyAnim();
  const colorOf = (id: string) => people.findIndex((p) => p.id === id);

  return (
    <>
      <p className="label" style={{ marginTop: 26 }}>
        {t("breakdown.settleUp")}
      </p>
      <div className="card settle">
        <div className="settle__q dim">{t("breakdown.whoPaid")}</div>
        <div className="who" style={{ marginTop: 10 }}>
          {people.map((p) => {
            const on = p.id === payerId;
            const ci = colorOf(p.id);
            return (
              <button
                key={p.id}
                className={`who__chip ${on ? "on" : ""}`}
                style={
                  on
                    ? { background: personColor(ci), color: personInk(ci), borderColor: "transparent" }
                    : undefined
                }
                onClick={() => onSetPayer(p.id)}
              >
                <span
                  className="avatar who__av"
                  style={{ background: personColor(ci), color: personInk(ci) }}
                >
                  {on ? <Check size={13} /> : initials(p.name)}
                </span>
                <span className="truncate">{p.name || "—"}</span>
              </button>
            );
          })}
        </div>

        {!payer || settle.length === 0 ? (
          <p className="muted settle__hint">{t("breakdown.coversOwn")}</p>
        ) : (
          <div className="col-gap" style={{ marginTop: 14 }}>
            {settle.map((s) => {
              const isPaid = paid.includes(s.from);
              const proof = proofOf?.(s.from) ?? null;
              return (
                <div className={`owe-row ${isPaid ? "is-paid" : ""}`} key={s.from}>
                  <button
                    className="owe-check"
                    aria-pressed={isPaid}
                    aria-label={t("breakdown.markPaid", { name: s.fromName || "—" })}
                    onClick={() => onTogglePaid(s.from)}
                  >
                    {isPaid ? <Check size={15} /> : null}
                  </button>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="owe-row__name truncate">{s.fromName || "—"}</div>
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
                      onClick={() => onViewProof?.(s.from)}
                      aria-label={t("shared.viewProof")}
                    >
                      <img src={proof} alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                    </button>
                  ) : null}
                  <span className="owe-row__amt disp tnum">
                    <AnimatedMoney value={s.amount} currency={currency} />
                  </span>
                </div>
              );
            })}

            {payer.accounts.length ? (
              <div className="pay-via">
                <div className="label" style={{ margin: "4px 0 8px" }}>
                  {t("breakdown.payVia", { name: payer.name || "—" })}
                </div>
                {payer.accounts.map((a) => (
                  <AccountRow key={a.id} methodKey={a.key} value={a.value} />
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
