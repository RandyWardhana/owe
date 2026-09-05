"use client";

import { useState } from "react";

import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { buzz } from "@/lib/util";
import { deleteBill } from "@/lib/bills";
import type { Draft } from "@/lib/types";

import Screen from "@/components/Screen";
import { Gear, Camera, Pencil, Receipt, Chevron, Trash } from "@/components/icons";
import Sheet from "@/components/Sheet";
import HistoryRow from "./HistoryRow";

export default function Home({ onOpenSettings }: { onOpenSettings: () => void }) {
  const t = useT();
  const currency = useStore((s) => s.currency);
  const history = useStore((s) => s.history);
  const draft = useStore((s) => s.draft);
  const startNew = useStore((s) => s.startNew);
  const applyScan = useStore((s) => s.applyScan);
  const openHistory = useStore((s) => s.openHistory);
  const deleteBillLocally = useStore((s) => s.deleteBillLocally);
  const discardDraft = useStore((s) => s.discardDraft);
  const showToast = useStore((s) => s.showToast);
  const [confirming, setConfirming] = useState<Draft | null>(null);
  const resume = useStore((s) => s.resume);

  const canResume = draft.items.length > 0 && draft.step !== "home";
  const heroLines = t("home.heroTitle").split("\n");

  const startManual = () => {
    buzz(8);
    applyScan({
      items: [],
      charges: { taxPct: 0, servicePct: 0, discount: 0 },
      source: "manual",
    });
  };

  const confirmDelete = async () => {
    const entry = confirming;
    if (!entry) return;
    setConfirming(null);
    buzz(10);
    // Server first: if that fails we keep the row, rather than hiding a bill
    // that is still reachable through its share link.
    const gone = await deleteBill(entry.id);
    if (!gone) {
      showToast("home.deleteFailed");
      return;
    }
    deleteBillLocally(entry.id);
    showToast("home.deleted");
  };

  return (
    <Screen
      title={t("app.name")}
      sub={t("app.sub")}
      right={
        <button className="iconbtn" aria-label={t("settings.title")} onClick={onOpenSettings}>
          <Gear size={20} />
        </button>
      }
      footer={
        <div className="col-gap">
          <button
            className="btn"
            onClick={() => {
              buzz(8);
              startNew("scan");
            }}
          >
            <Camera size={20} /> {t("home.scan")}
          </button>
          <button className="btn secondary" onClick={startManual}>
            <Pencil size={18} /> {t("home.manual")}
          </button>
        </div>
      }
    >
      <div className="pad rise">
        <div className="hero">
          <h2 className="disp hero__title">
            {heroLines.map((line, i) => (
              <span key={i}>
                {line}
                {i < heroLines.length - 1 ? <br /> : null}
              </span>
            ))}
          </h2>
          <p className="hero__sub dim">{t("home.heroSub")}</p>
        </div>

        {canResume ? (
          <div className="card resume">
            <button className="resume__open tappable" onClick={resume}>
            <div className="grow" style={{ textAlign: "left" }}>
              <div className="resume__title disp">{t("home.resume")}</div>
              <div className="muted resume__meta">
                {t("home.resumeMeta", {
                  items: draft.items.length,
                  people: draft.people.length,
                })}
              </div>
            </div>
              <Chevron size={20} />
            </button>
            <button
              className="iconbtn ghost"
              aria-label={t("home.discardDraft")}
              title={t("home.discardDraft")}
              onClick={() => {
                buzz(8);
                discardDraft();
                showToast("home.draftDiscarded");
              }}
            >
              <Trash size={17} />
            </button>
          </div>
        ) : null}

        <p className="label" style={{ marginTop: 26 }}>
          {t("home.recent")}
        </p>

        {history.length === 0 ? (
          <div className="card empty">
            <Receipt size={26} />
            <p className="muted">{t("home.emptyHistory")}</p>
          </div>
        ) : (
          <div className="stagger col-gap">
            {history.map((entry, i) => (
              <HistoryRow
                key={entry.id}
                draft={entry}
                index={i}
                currency={currency}
                onOpen={() => openHistory(entry)}
                onDelete={() => setConfirming(entry)}
              />
            ))}
          </div>
        )}
      </div>
      <Sheet
        open={!!confirming}
        onClose={() => setConfirming(null)}
        title={t("home.deleteTitle")}
      >
        <p className="muted" style={{ marginTop: 0 }}>
          {t("home.deleteBody", {
            name: confirming?.title || t("shared.defaultTitle"),
          })}
        </p>
        <div className="row" style={{ gap: 10, marginTop: 14 }}>
          <button
            className="btn secondary"
            style={{ width: "auto", flex: 1 }}
            onClick={() => setConfirming(null)}
          >
            {t("common.cancel")}
          </button>
          <button
            className="btn danger"
            style={{ width: "auto", flex: 1 }}
            onClick={confirmDelete}
          >
            {t("home.deleteConfirm")}
          </button>
        </div>
      </Sheet>
    </Screen>
  );
}
