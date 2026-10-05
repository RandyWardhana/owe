"use client";

import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { fmtMoney } from "@/lib/currency";
import { lineTotal, unitsOf } from "@/lib/calc";
import { buzz, initials, personColor, personInk } from "@/lib/util";

import Screen from "./Screen";
import { ArrowRight, Check, Minus, Plus } from "./icons";

export default function Assign() {
  const t = useT();
  const currency = useStore((s) => s.currency);
  const draft = useStore((s) => s.draft);
  const updateDraft = useStore((s) => s.updateDraft);
  const go = useStore((s) => s.go);

  const { items, people } = draft;
  const colorOf = (id: string) => people.findIndex((p) => p.id === id);

  const toggle = (itemId: string, personId: string) => {
    buzz(5);
    updateDraft((d) => ({
      ...d,
      items: d.items.map((it) => {
        if (it.id !== itemId) return it;
        const has = it.assignedTo.includes(personId);
        if (!has) return { ...it, assignedTo: [...it.assignedTo, personId] };
        // Stepping off forgets their count, so stepping back on starts at 1.
        const { [personId]: _dropped, ...units } = it.units || {};
        return {
          ...it,
          assignedTo: it.assignedTo.filter((a) => a !== personId),
          units,
        };
      }),
    }));
  };

  const step = (itemId: string, personId: string, delta: number) => {
    buzz(5);
    updateDraft((d) => ({
      ...d,
      items: d.items.map((it) =>
        it.id === itemId
          ? {
              ...it,
              units: {
                ...it.units,
                [personId]: Math.min(it.qty, Math.max(1, unitsOf(it, personId) + delta)),
              },
            }
          : it,
      ),
    }));
  };

  const setCountEach = (itemId: string, countEach: boolean) => {
    buzz(5);
    updateDraft((d) => ({
      ...d,
      items: d.items.map((it) => (it.id === itemId ? { ...it, countEach } : it)),
    }));
  };

  const setAll = (itemId: string, all: boolean) => {
    buzz(6);
    updateDraft((d) => ({
      ...d,
      items: d.items.map((it) =>
        it.id === itemId
          ? all
            ? { ...it, assignedTo: d.people.map((p) => p.id) }
            : { ...it, assignedTo: [], units: {} }
          : it,
      ),
    }));
  };

  const assignedCount = items.filter((it) => it.assignedTo.length > 0).length;
  const unassigned = items.length - assignedCount;

  return (
    <Screen
      title={t("assign.title")}
      sub={t("assign.counter", { assigned: assignedCount, total: items.length })}
      steps={{ current: 3, total: 4 }}
      footer={
        <button
          className="btn"
          onClick={() => {
            buzz(8);
            go("breakdown");
          }}
        >
          {unassigned > 0 ? (
            <span className="dim-strong">
              {unassigned === 1
                ? t("assign.notAssignedOne")
                : t("assign.notAssigned", { n: unassigned })}
            </span>
          ) : (
            <>
              {t("assign.next")} <ArrowRight size={20} />
            </>
          )}
        </button>
      }
    >
      <div className="pad">
        <p className="muted assign-hint">{t("assign.hint")}</p>

        <div className="col-gap stagger">
          {items.map((it, i) => {
            const everyone = it.assignedTo.length === people.length && people.length > 0;
            const assignees = people.filter((p) => it.assignedTo.includes(p.id));
            /* Counts only matter when several people are on a line of several:
               "6x Sparkling Lemon" where one of them had two. Even then the line
               is shared until the maker asks to count each person. */
            const countable = it.qty > 1 && assignees.length > 1;
            const counting = countable && Boolean(it.countEach);
            const shared = assignees.length > 1 && !counting;
            const counted = assignees.reduce((sum, p) => sum + unitsOf(it, p.id), 0);
            const uneven = counting && assignees.some((p) => unitsOf(it, p.id) !== 1);
            const each =
              it.assignedTo.length > 1 && !uneven ? lineTotal(it) / it.assignedTo.length : 0;
            return (
              <div className="card assign-item" key={it.id} style={{ ["--i" as string]: i }}>
                <div className="row between assign-item__head">
                  <div className="grow">
                    <div className="assign-item__title">
                      <span className="assign-item__name truncate">
                        {it.name || t("common.item")}
                        {it.qty > 1 ? <span className="muted"> ×{it.qty}</span> : null}
                      </span>
                      {shared ? <span className="badge-shared">{t("assign.shared")}</span> : null}
                    </div>
                    {each > 0 ? (
                      <div className="muted assign-item__each">
                        {t("assign.each", { amount: fmtMoney(each, currency) })}
                      </div>
                    ) : uneven ? (
                      <div className="muted assign-item__each">
                        {t("assign.perUnit", { amount: fmtMoney(lineTotal(it) / counted, currency) })}
                      </div>
                    ) : null}
                  </div>
                  <div className="assign-item__total disp tnum">
                    {fmtMoney(lineTotal(it), currency)}
                  </div>
                </div>

                <div className="who">
                  <button
                    className={`who__chip who__all ${everyone ? "on" : ""}`}
                    onClick={() => setAll(it.id, !everyone)}
                  >
                    {t("assign.all")}
                  </button>
                  {people.map((p) => {
                    const on = it.assignedTo.includes(p.id);
                    const ci = colorOf(p.id);
                    return (
                      <button
                        key={p.id}
                        className={`who__chip ${on ? "on" : ""}`}
                        style={
                          on
                            ? { background: personColor(ci), color: personInk(ci), borderColor: "transparent" }
                            : undefined
                        }
                        onClick={() => toggle(it.id, p.id)}
                      >
                        <span
                          className="avatar who__av"
                          style={{ background: personColor(ci), color: personInk(ci) }}
                        >
                          {on ? <Check size={13} /> : initials(p.name)}
                        </span>
                        <span className="truncate">{p.name || "—"}</span>
                      </button>
                    );
                  })}
                </div>

                {countable ? (
                  <div className="units">
                    <div className="seg seg--full units__mode" role="group">
                      <button
                        className={`seg__btn ${counting ? "" : "on"}`}
                        aria-pressed={!counting}
                        onClick={() => setCountEach(it.id, false)}
                      >
                        {t("assign.modeShared")}
                      </button>
                      <button
                        className={`seg__btn ${counting ? "on" : ""}`}
                        aria-pressed={counting}
                        onClick={() => setCountEach(it.id, true)}
                      >
                        {t("assign.modeEach")}
                      </button>
                    </div>
                    {counting ? (
                      <div className="muted units__hint">
                        {t("assign.howMany", { counted, qty: it.qty })}
                      </div>
                    ) : null}
                    {counting && assignees.map((p) => {
                      const n = unitsOf(it, p.id);
                      return (
                        <div className="row between units__row" key={p.id}>
                          <span className="truncate units__name">{p.name || "—"}</span>
                          <div className="units__step">
                            <button
                              className="units__btn"
                              aria-label={t("assign.less", { name: p.name || "—" })}
                              disabled={n <= 1}
                              onClick={() => step(it.id, p.id, -1)}
                            >
                              <Minus size={15} />
                            </button>
                            <span className="units__n tnum">{n}</span>
                            <button
                              className="units__btn"
                              aria-label={t("assign.more", { name: p.name || "—" })}
                              disabled={n >= it.qty}
                              onClick={() => step(it.id, p.id, 1)}
                            >
                              <Plus size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </Screen>
  );
}
