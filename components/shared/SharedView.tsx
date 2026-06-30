"use client";

import { useT } from "@/lib/i18n";
import { fmtMoney } from "@/lib/currency";
import { methodMeta } from "@/lib/payments";
import { useViewerPaid } from "@/lib/hooks/useViewerPaid";
import type { SharedBill, SharedBillPerson } from "@/lib/types";

import Screen from "@/components/Screen";
import { Check } from "@/components/icons";
import AnimatedMoney from "@/components/ui/AnimatedMoney";
import AccountRow from "@/components/ui/AccountRow";
import SharedPersonRow from "./SharedPersonRow";

export default function SharedView({
  bill,
  onMakeOwn,
}: {
  bill: SharedBill;
  onMakeOwn: () => void;
}) {
  const t = useT();
  const [paid, togglePaid] = useViewerPaid(bill);

  const currency = bill.currency || "USD";
  const payer = bill.payerIndex >= 0 ? bill.people[bill.payerIndex] : null;

  const personText = (person: SharedBillPerson, isPayer: boolean) => {
    if (payer && !isPayer) {
      const lines = [
        t("breakdown.owesLine", {
          from: person.name || "—",
          to: payer.name || "—",
          amount: fmtMoney(person.total, currency),
        }),
      ];
      if (payer.accounts.length) {
        lines.push(t("breakdown.payVia", { name: payer.name || "—" }));
        payer.accounts.forEach((account) =>
          lines.push(`  ${methodMeta(account.key).label}: ${account.value}`),
        );
      }
      return lines.join("\n");
    }
    return `${person.name || "—"}: ${fmtMoney(person.total, currency)}`;
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
          <h2 className="disp shared-title">{bill.title || t("shared.defaultTitle")}</h2>
          <div className="grand disp tnum">
            <AnimatedMoney value={bill.grandTotal} currency={currency} />
          </div>
          <div className="muted grand__sub">
            {t("shared.splitBetween", {
              n: bill.people.length,
              name: payer ? payer.name || "—" : "—",
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
                index={bill.payerIndex}
                currency={currency}
                isPayer
                isPaid={false}
                payerName={payer.name || "—"}
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
          {bill.people.map((person, i) =>
            i === bill.payerIndex ? null : (
              <SharedPersonRow
                key={i}
                person={person}
                index={i}
                currency={currency}
                isPayer={false}
                isPaid={paid.has(i)}
                payerName={payer?.name || "—"}
                onToggle={() => togglePaid(i)}
                copyText={personText(person, false)}
              />
            ),
          )}
        </div>

        {payer && payer.accounts.length ? (
          <>
            <p className="label" style={{ marginTop: 24 }}>
              {t("shared.sendShare", { name: payer.name || "—" })}
            </p>
            <div className="card pay-via">
              {payer.accounts.map((account, k) => (
                <AccountRow key={k} methodKey={account.key} value={account.value} />
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
