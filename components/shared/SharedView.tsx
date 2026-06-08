"use client";

import { useT } from "@/lib/i18n";
import { methodMeta } from "@/lib/payments";
import { useViewerPaid, useClipboard } from "@/lib/hooks";
import type { SharePayload } from "@/lib/types";

import Screen from "@/components/Screen";
import { Copy, Check } from "@/components/icons";
import AnimatedMoney from "@/components/ui/AnimatedMoney";
import SharedPersonRow from "./SharedPersonRow";

export default function SharedView({
  payload,
  onMakeOwn,
}: {
  payload: SharePayload;
  onMakeOwn: () => void;
}) {
  const t = useT();
  const copy = useClipboard();
  const [paid, togglePaid] = useViewerPaid(payload);

  const cur = payload.c || "USD";
  const payer = payload.py >= 0 ? payload.pp[payload.py] : null;

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

        <p className="label" style={{ marginTop: 24 }}>
          {t("shared.whoOwes")}
        </p>
        <p className="muted assign-hint" style={{ marginTop: -4 }}>
          {t("shared.markHint")}
        </p>
        <div className="col-gap stagger">
          {payload.pp.map((person, i) => (
            <SharedPersonRow
              key={i}
              person={person}
              index={i}
              currency={cur}
              isPayer={i === payload.py}
              isPaid={paid.has(i)}
              payerName={payer?.n || "—"}
              onToggle={() => togglePaid(i)}
            />
          ))}
        </div>

        {payer && payer.ac.length ? (
          <>
            <p className="label" style={{ marginTop: 24 }}>
              {t("shared.sendShare", { name: payer.n || "—" })}
            </p>
            <div className="card pay-via">
              {payer.ac.map((a, k) => {
                const m = methodMeta(a.k);
                return (
                  <button key={k} className="acct acct--tap" onClick={() => copy(a.v)}>
                    <span className="acct__dot" style={{ background: m.color }} />
                    <div className="grow" style={{ textAlign: "left" }}>
                      <div className="acct__label">{m.label}</div>
                      <div className="acct__val truncate">{a.v || "—"}</div>
                    </div>
                    <Copy size={16} />
                  </button>
                );
              })}
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
