"use client";

import { useMemo, useState } from "react";

import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { computeSplit, settlements } from "@/lib/calc";
import { buildSharedBill, buildSummaryText } from "@/lib/breakdown";
import { useShareLink } from "@/lib/hooks";
import { buzz } from "@/lib/util";

import Screen from "@/components/Screen";
import { Share, Lock, Check } from "@/components/icons";
import TotalCard from "./TotalCard";
import PerPersonList from "./PerPersonList";
import SettleUp from "./SettleUp";
import ShareSheet from "./ShareSheet";

export default function Breakdown() {
  const t = useT();
  const currency = useStore((s) => s.currency);
  const rounding = useStore((s) => s.rounding);
  const draft = useStore((s) => s.draft);
  const patchDraft = useStore((s) => s.patchDraft);
  const updateDraft = useStore((s) => s.updateDraft);
  const saveCurrent = useStore((s) => s.saveCurrent);
  const finish = useStore((s) => s.finish);
  const isSaved = useStore((s) => s.history.some((h) => h.id === draft.id));

  const [shareOpen, setShareOpen] = useState(false);

  const result = useMemo(() => computeSplit(draft, { rounding }), [draft, rounding]);
  const payerId = draft.payerId;
  const payer = draft.people.find((p) => p.id === payerId) || null;
  const settle = settlements(result.perPerson, payerId);
  const paid = useMemo(() => draft.paid || [], [draft.paid]);

  const bill = useMemo(
    () => buildSharedBill(draft.title, result, draft.people, payerId, currency, paid),
    [draft.title, draft.people, result, payerId, currency, paid],
  );
  const { link, label } = useShareLink(bill);
  const summary = useMemo(
    () => buildSummaryText(t, draft.title, result, payer, currency, paid),
    [t, draft.title, result, payer, currency, paid],
  );

  const setPayer = (id: string) => {
    buzz(6);
    patchDraft({ payerId: payerId === id ? null : id });
  };

  const togglePaid = (id: string) => {
    buzz(10);
    updateDraft((d) => {
      const cur = d.paid || [];
      return {
        ...d,
        paid: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
      };
    });
  };

  return (
    <Screen
      title={t("breakdown.title")}
      steps={{ current: 4, total: 4 }}
      footer={
        <div className="row" style={{ gap: 10 }}>
          <button
            className="btn secondary"
            style={{ width: "auto", flex: 1 }}
            disabled={!isSaved}
            title={!isSaved ? t("breakdown.lockToShare") : undefined}
            onClick={() => {
              buzz(8);
              setShareOpen(true);
            }}
          >
            <Share size={18} /> {t("breakdown.share")}
          </button>
          {isSaved ? (
            <button
              className="btn"
              style={{ width: "auto", flex: 1.4 }}
              onClick={() => {
                buzz(8);
                finish();
              }}
            >
              <Check size={18} /> {t("breakdown.done")}
            </button>
          ) : (
            <button
              className="btn"
              style={{ width: "auto", flex: 1.4 }}
              onClick={() => saveCurrent(result, payerId)}
            >
              <Lock size={18} /> {t("breakdown.lockIn")}
            </button>
          )}
        </div>
      }
      overlay={
        <ShareSheet
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          title={draft.title}
          link={link}
          label={label}
          summary={summary}
        />
      }
    >
      <div className="pad">
        <TotalCard result={result} currency={currency} />
        <PerPersonList
          perPerson={result.perPerson}
          people={draft.people}
          payer={payer}
          currency={currency}
        />
        <SettleUp
          people={draft.people}
          payer={payer}
          payerId={payerId}
          settle={settle}
          paid={paid}
          currency={currency}
          summary={summary}
          onSetPayer={setPayer}
          onTogglePaid={togglePaid}
        />
      </div>
    </Screen>
  );
}
