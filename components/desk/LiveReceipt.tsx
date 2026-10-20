"use client";

import { useMemo } from "react";

import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { receiptFromDraft, settleStatus } from "@/lib/receipt";

import ReceiptFrame from "./ReceiptFrame";
import ReceiptPaper from "./ReceiptPaper";

const IDLE_STEPS = ["idle1", "idle2", "idle3"] as const;
const SHIMMER_LINES = 6;

export default function LiveReceipt() {
  const t = useT();
  const view = useStore((s) => s.view);
  const draft = useStore((s) => s.draft);
  const history = useStore((s) => s.history);
  const currency = useStore((s) => s.currency);
  const rounding = useStore((s) => s.rounding);

  const editing = view !== "home" && view !== "scan";
  const unfinished = draft.items.length > 0 && draft.step !== "home" && !history.some((entry) => entry.id === draft.id);
  const shown = editing ? draft : view === "home" ? (unfinished ? draft : history[0]) : undefined;

  const receipt = useMemo(
    () => (shown ? receiptFromDraft(shown, currency, rounding) : null),
    [shown, currency, rounding],
  );

  if (view === "scan") {
    return (
      <div className="ws-receipt__inner">
        <article className="rp rp--reading" aria-live="polite">
          <ReceiptFrame
            seed="scan"
            heading={t("desk.receipt.heading")}
            status={{ tone: "live", text: t("desk.receipt.pillWaiting") }}
            lead={<span className="rp__lead-label">{t("desk.receipt.reading")}</span>}
          >
            <div className="rp__shimmer" aria-hidden="true">
              {Array.from({ length: SHIMMER_LINES }).map((_, index) => (
                <i key={index} style={{ ["--i" as string]: index }} />
              ))}
            </div>
          </ReceiptFrame>
        </article>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="ws-receipt__inner">
        <article className="rp rp--idle">
          <ReceiptFrame
            seed="idle"
            heading={t("desk.receipt.heading")}
            status={{ tone: "pending", text: t("desk.receipt.pillReady") }}
            lead={<span className="rp__idle-title disp">{t("desk.receipt.idleTitle")}</span>}
          >
            <ol className="rp__how">
              {IDLE_STEPS.map((key, index) => (
                <li key={key} style={{ ["--i" as string]: index }}>
                  <span className="rp__how-n disp">{index + 1}</span>
                  {t(`desk.receipt.${key}`)}
                </li>
              ))}
            </ol>
          </ReceiptFrame>
        </article>
      </div>
    );
  }

  const settled = settleStatus(receipt, t);
  const heading = editing
    ? t("desk.receipt.liveHeading")
    : unfinished
      ? t("desk.receipt.draftHeading")
      : t("desk.receipt.last");
  const status =
    view === "breakdown" || (!editing && !unfinished)
      ? settled
      : editing
        ? { tone: "live" as const, text: t("desk.receipt.pillLive") }
        : { tone: "pending" as const, text: t("desk.receipt.inProgress") };

  return (
    <div className="ws-receipt__inner">
      <ReceiptPaper receipt={receipt} heading={heading} status={status} showStubs={view === "breakdown"} />
    </div>
  );
}
