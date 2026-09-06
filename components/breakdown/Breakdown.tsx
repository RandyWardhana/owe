"use client";

import { useEffect, useMemo, useState } from "react";

import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { computeSplit, settlements } from "@/lib/calc";
import { buildSharedBill, buildSummaryText } from "@/lib/breakdown";
import { useShareLink } from "@/lib/hooks";
import { billId } from "@/lib/bills";
import { useOwnerSettlement } from "@/lib/hooks/useOwnerSettlement";
import ProofLightbox from "@/components/ui/ProofLightbox";
import { buzz } from "@/lib/util";

import Screen from "@/components/Screen";
import { Share, Lock, Check, Pencil } from "@/components/icons";
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
  const editStep = useStore((s) => s.editStep);
  const isSaved = useStore((s) => s.history.some((h) => h.id === draft.id));

  const [shareOpen, setShareOpen] = useState(false);

  const result = useMemo(() => computeSplit(draft, { rounding }), [draft, rounding]);
  const payerId = draft.payerId;
  const payer = draft.people.find((p) => p.id === payerId) || null;
  const settle = settlements(result.perPerson, payerId);
  const paid = useMemo(() => draft.paid || [], [draft.paid]);

  // Once a bill is shared, the server holds the truth about who has settled --
  // that is what the people holding the link are writing to. Before that it is
  // just this device's own list.
  const shared = isSaved && Boolean(draft.shareId);
  const owner = useOwnerSettlement(draft.people, draft.shareId ?? null, shared);
  const [viewingProof, setViewingProof] = useState<string | null>(null);

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

  const paidList = shared ? owner.paidIds : paid;

  // Once a bill is shared the server owns the answer, so mirror it back into
  // the draft. Without this, `paid` kept whatever was ticked before sharing --
  // and the share payload, the summary text and the history entry all went on
  // reporting someone as settled after the confirmation had been undone.
  useEffect(() => {
    if (!shared) return;
    const same =
      paid.length === owner.paidIds.length &&
      paid.every((id) => owner.paidIds.includes(id));
    if (!same) patchDraft({ paid: owner.paidIds });
  }, [shared, owner.paidIds, paid, patchDraft]);

  /* A claim from the shared link becomes a real assignment here. Keeping it as
     a separate ledger would mean every total, the summary text and the next
     share payload each had to remember to add it on; folding it into the draft
     means the item is simply that person's, the way it would have been had the
     maker known at the table. */
  useEffect(() => {
    if (!shared) return;
    const known = new Set(draft.people.map((p) => p.id));
    const pending = Object.entries(owner.claimedBy)
      .map(([itemId, ids]) => [itemId, ids.filter((id) => known.has(id))] as const)
      .filter(([itemId, ids]) => {
        if (!ids.length) return false;
        const item = draft.items.find((candidate) => candidate.id === itemId);
        return Boolean(item) && !(item!.assignedTo || []).length;
      });
    if (!pending.length) return;

    updateDraft((d) => ({
      ...d,
      items: d.items.map((item) => {
        const claim = pending.find(([itemId]) => itemId === item.id);
        return claim ? { ...item, assignedTo: [...claim[1]] } : item;
      }),
    }));
  }, [shared, owner.claimedBy, draft.items, draft.people, updateDraft]);

  const summary = useMemo(
    () => buildSummaryText(t, draft.title, result, payer, currency, paidList),
    [t, draft.title, result, payer, currency, paidList],
  );
  const onTogglePaid = shared ? owner.togglePaid : togglePaid;

  const bill = useMemo(
    () => buildSharedBill(draft.title, result, draft.people, payerId, currency, paidList),
    [draft.title, draft.people, result, payerId, currency, paidList],
  );
  // Freeze the share id the first time a bill is locked, seeding it from the
  // content hash so links already sent out keep resolving. After that an edit
  // republishes to the SAME id instead of stranding everyone on the old one.
  const shareId = draft.shareId || billId(bill);

  useEffect(() => {
    if (isSaved && !draft.shareId) patchDraft({ shareId });
  }, [isSaved, draft.shareId, shareId, patchDraft]);

  const { link, label } = useShareLink(bill, shareId);

  return (
    <Screen
      title={t("breakdown.title")}
      steps={{ current: 4, total: 4 }}
      right={
        <button
          className="iconbtn"
          aria-label={t("breakdown.editItems")}
          title={t("breakdown.editItems")}
          onClick={() => {
            buzz(6);
            editStep("assign");
          }}
        >
          <Pencil size={18} />
        </button>
      }
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
          paid={paidList}
          currency={currency}
          summary={summary}
          onSetPayer={setPayer}
          onTogglePaid={onTogglePaid}
          proofOf={shared ? owner.proofFor : undefined}
          onViewProof={shared ? setViewingProof : undefined}
        />
      </div>
      {viewingProof && owner.proofFor(viewingProof) ? (
        <ProofLightbox
          src={owner.proofFor(viewingProof) as string}
          label={t("shared.viewProof")}
          onClose={() => setViewingProof(null)}
        />
      ) : null}
    </Screen>
  );
}
