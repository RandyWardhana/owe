"use client";

import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { fmtMoney } from "@/lib/currency";
import { buzz, initials, personColor, personInk } from "@/lib/util";
import { originOf, switchTheme } from "@/lib/themeTransition";
import { useBillDeletion, useStartSplit } from "@/lib/hooks";

import { Camera, Gear, Moon, Pencil, Receipt, Sun, Trash } from "@/components/icons";
import DeleteBillSheet from "@/components/home/DeleteBillSheet";
import type { SidebarProps } from "@/entities/props/desk";

const AVATARS = 3;

export default function Sidebar({ onOpenSettings }: SidebarProps) {
  const t = useT();
  const view = useStore((s) => s.view);
  const draft = useStore((s) => s.draft);
  const history = useStore((s) => s.history);
  const currency = useStore((s) => s.currency);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const goHome = useStore((s) => s.goHome);
  const resume = useStore((s) => s.resume);
  const openHistory = useStore((s) => s.openHistory);
  const start = useStartSplit();
  const deletion = useBillDeletion();

  const unfinished = draft.items.length > 0 && draft.step !== "home" && !history.some((entry) => entry.id === draft.id);
  const openId = view === "home" ? null : draft.id;

  return (
    <aside className="ws-side" aria-label={t("desk.side.label")}>
      <button className="ws-brand" onClick={goHome}>
        <span className="ws-brand__mark disp">{t("app.name")}</span>
        <span className="ws-brand__sub">{t("app.sub")}</span>
      </button>

      <div className="ws-side__start">
        <button className="btn" onClick={start.scan}>
          <Camera size={19} /> {t("home.scan")}
        </button>
        <button className="btn secondary" onClick={start.manual}>
          <Pencil size={17} /> {t("home.manual")}
        </button>
      </div>

      <nav className="ws-nav">
        <button className={`ws-nav__item${view === "home" ? " on" : ""}`} onClick={goHome}>
          <Receipt size={17} /> {t("desk.side.overview")}
        </button>
        {unfinished ? (
          <button className={`ws-nav__item${openId === draft.id ? " on" : ""}`} onClick={resume}>
            <Pencil size={16} />
            <span className="truncate">{draft.title || t("shared.defaultTitle")}</span>
            <span className="ws-nav__tag">{t("desk.side.draft")}</span>
          </button>
        ) : null}
      </nav>

      <p className="label ws-side__label">{t("home.recent")}</p>
      <div className="ws-hist">
        {history.length === 0 ? (
          <p className="muted ws-hist__empty">{t("home.emptyHistory")}</p>
        ) : (
          history.map((entry) => (
            <div key={entry.id} className={`ws-hist__row${openId === entry.id ? " on" : ""}`}>
              <button className="ws-hist__open" onClick={() => openHistory(entry)}>
                <span className="ws-hist__avatars" aria-hidden="true">
                  {entry.people.slice(0, AVATARS).map((person, index) => (
                    <span
                      key={person.id}
                      className="avatar"
                      style={{ background: personColor(index), color: personInk(index) }}
                    >
                      {initials(person.name)}
                    </span>
                  ))}
                </span>
                <span className="ws-hist__text">
                  <b className="truncate">{entry.title || t("shared.defaultTitle")}</b>
                  <small className="tnum">
                    {new Date(entry.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} ·{" "}
                    {fmtMoney(entry.summary?.grandTotal ?? 0, entry.currency || currency)}
                  </small>
                </span>
              </button>
              <button
                className="ws-hist__del"
                aria-label={t("home.deleteBill", { name: entry.title || t("shared.defaultTitle") })}
                onClick={() => deletion.ask(entry)}
              >
                <Trash size={15} />
              </button>
            </div>
          ))
        )}
      </div>

      <footer className="ws-side__foot">
        <button className="ws-nav__item" onClick={onOpenSettings}>
          <Gear size={17} /> {t("settings.title")}
        </button>
        <button
          className="iconbtn ws-theme"
          aria-label={t(theme === "dark" ? "desk.side.light" : "desk.side.dark")}
          title={t(theme === "dark" ? "desk.side.light" : "desk.side.dark")}
          onClick={(event) => {
            buzz(8);
            switchTheme(theme === "dark" ? "light" : "dark", setTheme, originOf(event));
          }}
        >
          {theme === "dark" ? <Sun size={18} className="seg__sun" /> : <Moon size={18} className="seg__moon" />}
        </button>
      </footer>

      <DeleteBillSheet bill={deletion.confirming} onCancel={deletion.cancel} onConfirm={deletion.confirm} />
    </aside>
  );
}
