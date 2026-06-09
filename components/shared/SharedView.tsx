"use client";

import { useT } from "@/lib/i18n";
import { fmtMoney } from "@/lib/currency";
import { methodMeta } from "@/lib/payments";
import { useViewerPaid } from "@/lib/hooks/useViewerPaid";
import type { SharePayload } from "@/lib/types";

type SharedPerson = SharePayload["pp"][number];

import Screen from "@/components/Screen";
import { Check } from "@/components/icons";
import AnimatedMoney from "@/components/ui/AnimatedMoney";
import AccountRow from "@/components/ui/AccountRow";
import SharedPersonRow from "./SharedPersonRow";

export default function SharedView({
  payload,
  onMakeOwn,
}: {
  payload: SharePayload;
  onMakeOwn: () => void;
}) {
  const t = useT();
  const [paid, togglePaid] = useViewerPaid(payload);

  const cur = payload.c || "USD";
  const payer = payload.py >= 0 ? payload.pp[payload.py] : null;

  const personText = (person: SharedPerson, isPayer: boolean) => {
    if (payer && !isPayer) {
      const lines = [
        t("breakdown.owesLine", {
          from: person.n || "—",
          to: payer.n || "—",
          amount: fmtMoney(person.t, cur),
        }),
      ];
      if (payer.ac.length) {
        lines.push(t("breakdown.payVia", { name: payer.n || "—" }));
        payer.ac.forEach((a) =>
          lines.push(`  ${methodMeta(a.k).label}: ${a.v}`),
        );
      }
      return lines.join("\n");
    }
    return `${person.n || "—"}: ${fmtMoney(person.t, cur)}`;
  };

  return (
    <Screen
      footer={
        <button className="btn secondary" onClick={onMakeOwn}>
          {t("shared.makeOwn")}
        </button>
      }
    >
      <div className="pad rise" style={{ paddingTop: "calc(20px + var(--safe-top))" }}>
        <div className="shared-mark disp">{t("app.name")}</div>
        <p className="label" style={{ marginTop: 18 }}>
          {t("shared.intro")}
        </p>
        <div className="card hero-total">
          <h2 className="disp shared-title">{payload.t || t("shared.defaultTitle")}</h2>
          <div className="grand disp tnum">
            <AnimatedMoney value={payload.g} currency={cur} />
          </div>
          <div className="muted grand__sub">
            {t("shared.splitBetween", {
              n: payload.pp.length,
              name: payer ? payer.n || "—" : "—",
            })}
          </div>
        </div>

        {payer ? (
          <>
            <p className="label" style={{ marginTop: 24 }}>
              {t("shared.paidBy")}
            </p>
            <div className="col-gap">
              <SharedPersonRow
                person={payer}
                index={payload.py}
                currency={cur}
                isPayer
                isPaid={false}
                payerName={payer.n || "—"}
                onToggle={() => {}}
                copyText={personText(payer, true)}
              />
            </div>
          </>
        ) : null}

        <p className="label" style={{ marginTop: 24 }}>
          {t("shared.whoOwes")}
        </p>
        <p className="muted assign-hint" style={{ marginTop: -4 }}>
          {t("shared.markHint")}
        </p>
        <div className="col-gap stagger">
          {payload.pp.map((person, i) =>
            i === payload.py ? null : (
              <SharedPersonRow
                key={i}
                person={person}
                index={i}
                currency={cur}
                isPayer={false}
                isPaid={paid.has(i)}
                payerName={payer?.n || "—"}
                onToggle={() => togglePaid(i)}
                copyText={personText(person, false)}
              />
            ),
          )}
        </div>

        {payer && payer.ac.length ? (
          <>
            <p className="label" style={{ marginTop: 24 }}>
              {t("shared.sendShare", { name: payer.n || "—" })}
            </p>
            <div className="card pay-via">
              {payer.ac.map((a, k) => (
                <AccountRow key={k} methodKey={a.k} value={a.v} />
              ))}
            </div>
          </>
        ) : null}

        <p className="muted center shared-foot">
          <Check size={13} /> {t("shared.footer")}
        </p>
      </div>
    </Screen>
  );
}
