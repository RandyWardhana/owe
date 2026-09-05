"use client";

import { useMemo, useState } from "react";

import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { fmtAmountPlain, fmtMoney } from "@/lib/currency";
import { useSettlement } from "@/lib/hooks/useSettlement";
import { ownerToken } from "@/lib/billOwner";
import { billId } from "@/lib/bills";
import { proofUrl } from "@/lib/proofs";
import type { SharedBill } from "@/lib/types";

import Screen from "@/components/Screen";
import { Check } from "@/components/icons";
import AnimatedMoney from "@/components/ui/AnimatedMoney";
import AccountRow from "@/components/ui/AccountRow";
import ProofLightbox from "@/components/ui/ProofLightbox";
import SharedPersonRow from "./SharedPersonRow";

export default function SharedView({
  bill,
  onMakeOwn,
}: {
  bill: SharedBill;
  onMakeOwn: () => void;
}) {
  const t = useT();
  const { paid, proofs, isOwner, uploading, confirm, submitProof, dropProof } =
    useSettlement(bill);
  const [viewing, setViewing] = useState<number | null>(null);
  const showToast = useStore((state) => state.showToast);

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
  const id = useMemo(() => billId(bill), [bill]);

  const currency = bill.currency || "USD";
  const payer = bill.payerIndex >= 0 ? bill.people[bill.payerIndex] : null;


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
        {viewing !== null && isOwner ? (
          <ProofLightbox
            src={proofUrl(id, viewing, ownerToken(id) ?? "")}
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
                onToggle={() => confirm(i)}
                copyText={fmtAmountPlain(person.total, currency)}
                isOwner={isOwner}
                hasProof={proofs.has(i)}
                uploading={uploading === i}
                onProof={(file) => handleProof(i, file)}
                onViewProof={() => setViewing(i)}
                onRemoveProof={() => handleRemove(i)}
                proofSrc={isOwner ? proofUrl(id, i, ownerToken(id) ?? "") : undefined}
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
