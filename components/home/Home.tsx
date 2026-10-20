"use client";

import { useMemo } from "react";

import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { fmtMoney } from "@/lib/currency";
import { buzz } from "@/lib/util";
import { useBillDeletion, useStartSplit } from "@/lib/hooks";

import Screen from "@/components/Screen";
import { ArrowRight, Camera, Chevron, Gear, Pencil, Receipt, Trash } from "@/components/icons";
import DeleteBillSheet from "./DeleteBillSheet";
import HistoryRow from "./HistoryRow";
import type { HomeProps } from "@/entities/props/home";

export default function Home({ onOpenSettings }: HomeProps) {
  const t = useT();
  const currency = useStore((s) => s.currency);
  const history = useStore((s) => s.history);
  const draft = useStore((s) => s.draft);
  const openHistory = useStore((s) => s.openHistory);
  const discardDraft = useStore((s) => s.discardDraft);
  const showToast = useStore((s) => s.showToast);
  const resume = useStore((s) => s.resume);
  const start = useStartSplit();
  const deletion = useBillDeletion();

  const canResume = draft.items.length > 0 && draft.step !== "home";
  const heroLines = t("home.heroTitle").split("\n");

  const stats = useMemo(() => {
    const people = new Set(
      history.flatMap((entry) => entry.people.map((person) => person.name.trim().toLowerCase()).filter(Boolean)),
    );
    const total = history
      .filter((entry) => (entry.currency || currency) === currency)
      .reduce((sum, entry) => sum + (entry.summary?.grandTotal ?? 0), 0);
    return { splits: history.length, people: people.size, total };
  }, [history, currency]);

  return (
    <Screen
      className="screen--home"
      title={t("app.name")}
      sub={t("app.sub")}
      right={
        <button className="iconbtn" aria-label={t("settings.title")} onClick={onOpenSettings}>
          <Gear size={20} />
        </button>
      }
      footer={
        <div className="col-gap">
          <button className="btn" onClick={start.scan}>
            <Camera size={20} /> {t("home.scan")}
          </button>
          <button className="btn secondary" onClick={start.manual}>
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
                  {t("home.resumeMeta", { items: draft.items.length, people: draft.people.length })}
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

        <section className="home-desk">
          <div className="home-desk__start">
            <button className="home-card home-card--scan" onClick={start.scan}>
              <span className="home-card__icon">
                <Camera size={26} />
              </span>
              <b className="disp">{t("home.scan")}</b>
              <small>{t("desk.home.scanBody")}</small>
              <span className="home-card__go" aria-hidden="true">
                <ArrowRight size={20} />
              </span>
            </button>
            <button className="home-card" onClick={start.manual}>
              <span className="home-card__icon">
                <Pencil size={24} />
              </span>
              <b className="disp">{t("home.manual")}</b>
              <small>{t("desk.home.manualBody")}</small>
              <span className="home-card__go" aria-hidden="true">
                <ArrowRight size={20} />
              </span>
            </button>
          </div>

          {stats.splits ? (
            <dl className="home-desk__stats">
              <div>
                <dt>{t("desk.home.splits")}</dt>
                <dd className="disp tnum">{stats.splits}</dd>
              </div>
              <div>
                <dt>{t("desk.home.people")}</dt>
                <dd className="disp tnum">{stats.people}</dd>
              </div>
              <div>
                <dt>{t("desk.home.total")}</dt>
                <dd className="disp tnum">{fmtMoney(stats.total, currency)}</dd>
              </div>
            </dl>
          ) : (
            <p className="home-desk__hint muted">{t("desk.home.firstHint")}</p>
          )}
        </section>

        <div className="home-recent">
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
                  onDelete={() => deletion.ask(entry)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <DeleteBillSheet bill={deletion.confirming} onCancel={deletion.cancel} onConfirm={deletion.confirm} />
    </Screen>
  );
}
