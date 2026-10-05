"use client";

import { useMemo, useState } from "react";

import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { fmtAmountPlain, fmtMoney } from "@/lib/currency";
import { useSettlement } from "@/lib/hooks/useSettlement";
import { useRate } from "@/lib/hooks/useRate";
import { billId } from "@/lib/bills";
import { proofUrl } from "@/lib/proofs";
import type { SharedBill } from "@/lib/types";
import { convertBill } from "@/lib/convert";

import Screen from "@/components/Screen";
import { Check, Gear } from "@/components/icons";
import Settings from "@/components/Settings";
import AnimatedMoney from "@/components/ui/AnimatedMoney";
import AccountRow from "@/components/ui/AccountRow";
import ProofLightbox from "@/components/ui/ProofLightbox";
import ClaimList from "./ClaimList";
import SharedPersonRow from "./SharedPersonRow";

export default function SharedView({
  bill,
  shareId,
  onMakeOwn,
}: {
  bill: SharedBill;
  shareId?: string | null;
  onMakeOwn: () => void;
}) {
  const t = useT();
  const {
    paid,
    proofs,
    isOwner,
    uploading,
    claims,
    claimedTotals,
    claim,
    confirm,
    submitProof,
    dropProof,
  } = useSettlement(bill, shareId ?? undefined);
  const [viewing, setViewing] = useState<number | null>(null);
  const showToast = useStore((state) => state.showToast);
  const viewCurrency = useStore((state) => state.viewCurrency);
  const lang = useStore((state) => state.lang);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // uploadProof reports why it failed; without this the file simply vanished.
  const handleRemove = async (index: number) => {
    const result = await dropProof(index);
    if (result.ok) return;
    showToast(
      result.reason === "confirmed"
        ? "shared.proofRemoveLocked"
        : "shared.proofFailed",
    );
  };

  const handleProof = async (index: number, file: File) => {
    const result = await submitProof(index, file);
    if (result.ok) return;
    showToast(
      result.reason === "size"
        ? "shared.proofTooBig"
        : result.reason === "type"
          ? "shared.proofBadType"
          : "shared.proofFailed",
    );
  };
  const id = useMemo(() => shareId || billId(bill), [bill, shareId]);

  /* Shown -- and copied -- in the viewer's currency if they picked one: a
     friend paying from a Malaysian account sends ringgit, so the amount they
     paste into their banking app has to be ringgit too. The bill's own amount
     stays under each total for whoever pays in it. */
  const billCurrency = bill.currency || "USD";
  const rateState = useRate(billCurrency, viewCurrency);
  const rate = rateState.status === "ready" ? rateState.rate : 1;
  const converting = rateState.status === "ready";
  const currency = converting ? (viewCurrency as string) : billCurrency;
  const shown = useMemo(() => convertBill(bill, rate, currency), [bill, rate, currency]);
  const payer = shown.payerIndex >= 0 ? shown.people[shown.payerIndex] : null;
  const originalOf = (amount: number) =>
    converting ? fmtMoney(amount, billCurrency) : undefined;


  return (
    <Screen
      footer={
        <button className="btn secondary" onClick={onMakeOwn}>
          {t("shared.makeOwn")}
        </button>
      }
    >
      <div className="pad rise" style={{ paddingTop: "calc(20px + var(--safe-top))" }}>
        <div className="row between">
          <div className="shared-mark disp">{t("app.name")}</div>
          <button
            className="iconbtn"
            aria-label={t("settings.title")}
            onClick={() => setSettingsOpen(true)}
          >
            <Gear size={20} />
          </button>
        </div>
        <p className="label" style={{ marginTop: 18 }}>
          {t("shared.intro")}
        </p>
        <div className="card hero-total">
          <h2 className="disp shared-title">{bill.title || t("shared.defaultTitle")}</h2>
          <div className="grand disp tnum">
            <AnimatedMoney value={shown.grandTotal} currency={currency} />
          </div>
          {converting ? (
            <div className="muted grand__orig tnum">{fmtMoney(bill.grandTotal, billCurrency)}</div>
          ) : null}
          <div className="muted grand__sub">
            {t("shared.splitBetween", {
              n: shown.people.length,
              name: payer ? payer.name || "—" : "—",
            })}
          </div>
        </div>

        {rateState.status === "ready" ? (
          <div className="banner rate-note">
            {t("shared.rateNote", {
              one: fmtMoney(1, currency),
              rate: fmtMoney(1 / rate, billCurrency),
              date: rateState.date
                ? new Date(`${rateState.date}T00:00:00`).toLocaleDateString(
                    lang === "id" ? "id-ID" : "en-GB",
                    { day: "numeric", month: "short", year: "numeric" },
                  )
                : "—",
              bill: billCurrency,
            })}
          </div>
        ) : rateState.status === "failed" ? (
          <div className="banner rate-note">{t("shared.rateFailed", { bill: billCurrency })}</div>
        ) : null}

        {payer ? (
          <>
        {viewing !== null ? (
          <ProofLightbox
            src={proofUrl(id, viewing)}
            label={t("shared.viewProof")}
            onClose={() => setViewing(null)}
          />
        ) : null}

            <p className="label" style={{ marginTop: 24 }}>
              {t("shared.paidBy")}
            </p>
            <div className="col-gap">
              <SharedPersonRow
                person={payer}
                index={bill.payerIndex}
                currency={currency}
                original={originalOf(bill.people[bill.payerIndex].total)}
                isPayer
                isPaid={false}
                payerName={payer.name || "—"}
                onToggle={() => {}}
                copyText={fmtAmountPlain(payer.total, currency)}
              />
            </div>
          </>
        ) : null}


        <p className="label" style={{ marginTop: 24 }}>
          {t("shared.whoOwes")}
        </p>
        <p className="muted assign-hint" style={{ marginTop: -4 }}>
          {isOwner ? t("shared.markHint") : t("shared.markHintGuest")}
        </p>
        <div className="col-gap stagger">
          {shown.people.map((person, i) =>
            i === bill.payerIndex ? null : (
              <SharedPersonRow
                key={i}
                person={{ ...person, total: person.total + claimedTotals[i] * rate }}
                index={i}
                currency={currency}
                original={originalOf(bill.people[i].total + claimedTotals[i])}
                isPayer={false}
                isPaid={paid.has(i)}
                payerName={payer?.name || "—"}
                onToggle={() => confirm(i)}
                copyText={fmtAmountPlain(person.total + claimedTotals[i] * rate, currency)}
                isOwner={isOwner}
                hasProof={proofs.has(i)}
                uploading={uploading === i}
                onProof={(file) => handleProof(i, file)}
                onViewProof={() => setViewing(i)}
                onRemoveProof={() => handleRemove(i)}
                proofSrc={proofs.has(i) ? proofUrl(id, i) : undefined}
              />
            ),
          )}
        </div>

        <ClaimList
          items={shown.claimable}
          people={shown.people}
          claims={claims}
          currency={currency}
          feeRate={bill.feeRate}
          paid={paid}
          onClaim={claim}
        />

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
      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        billCurrency={billCurrency}
      />
    </Screen>
  );
}
