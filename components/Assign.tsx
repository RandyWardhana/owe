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
  const colorOf = (id: string) => people.findIndex((person) => person.id === id);

  const toggle = (itemId: string, personId: string) => {
    buzz(5);
    updateDraft((draft) => ({
      ...draft,
      items: draft.items.map((item) => {
        if (item.id !== itemId) return item;
        const has = item.assignedTo.includes(personId);
        if (!has) return { ...item, assignedTo: [...item.assignedTo, personId] };
        // Stepping off forgets their count, so stepping back on starts at 1.
        const { [personId]: _dropped, ...units } = item.units || {};
        return {
          ...item,
          assignedTo: item.assignedTo.filter((assigneeId) => assigneeId !== personId),
          units,
        };
      }),
    }));
  };

  const step = (itemId: string, personId: string, delta: number) => {
    buzz(5);
    updateDraft((draft) => ({
      ...draft,
      items: draft.items.map((item) => {
        if (item.id !== itemId) return item;
        // Nobody can take one more once the whole line is accounted for.
        const counted = item.assignedTo.reduce((sum, id) => sum + unitsOf(item, id), 0);
        if (delta > 0 && counted >= item.qty) return item;
        return {
          ...item,
          units: {
            ...item.units,
            [personId]: Math.min(item.qty, Math.max(1, unitsOf(item, personId) + delta)),
          },
        };
      }),
    }));
  };

  const setCountEach = (itemId: string, countEach: boolean) => {
    buzz(5);
    updateDraft((draft) => ({
      ...draft,
      items: draft.items.map((item) => (item.id === itemId ? { ...item, countEach } : item)),
    }));
  };

  const setAll = (itemId: string, all: boolean) => {
    buzz(6);
    updateDraft((draft) => ({
      ...draft,
      items: draft.items.map((item) =>
        item.id === itemId
          ? all
            ? { ...item, assignedTo: draft.people.map((person) => person.id) }
            : { ...item, assignedTo: [], units: {} }
          : item,
      ),
    }));
  };

  const assignedCount = items.filter((item) => item.assignedTo.length > 0).length;
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
          {items.map((item, i) => {
            const everyone = item.assignedTo.length === people.length && people.length > 0;
            const assignees = people.filter((person) => item.assignedTo.includes(person.id));
            /* Counts only matter when several people are on a line of several:
               "6x Sparkling Lemon" where one of them had two. Even then the line
               is shared until the maker asks to count each person. */
            const countable = item.qty > 1 && assignees.length > 1;
            const counting = countable && Boolean(item.countEach);
            const shared = assignees.length > 1 && !counting;
            const counted = assignees.reduce((sum, person) => sum + unitsOf(item, person.id), 0);
            const uneven = counting && assignees.some((person) => unitsOf(item, person.id) !== 1);
            const each =
              item.assignedTo.length > 1 && !uneven ? lineTotal(item) / item.assignedTo.length : 0;
            return (
              <div className="card assign-item" key={item.id} style={{ ["--i" as string]: i }}>
                <div className="row between assign-item__head">
                  <div className="grow">
                    <div className="assign-item__title">
                      <span className="assign-item__name truncate">
                        {item.name || t("common.item")}
                        {item.qty > 1 ? <span className="muted"> ×{item.qty}</span> : null}
                      </span>
                      {shared ? <span className="badge-shared">{t("assign.shared")}</span> : null}
                    </div>
                    {each > 0 ? (
                      <div className="muted assign-item__each">
                        {t("assign.each", { amount: fmtMoney(each, currency) })}
                      </div>
                    ) : uneven ? (
                      <div className="muted assign-item__each">
                        {t("assign.perUnit", { amount: fmtMoney(lineTotal(item) / counted, currency) })}
                      </div>
                    ) : null}
                  </div>
                  <div className="assign-item__total disp tnum">
                    {fmtMoney(lineTotal(item), currency)}
                  </div>
                </div>

                <div className="who">
                  <button
                    className={`who__chip who__all ${everyone ? "on" : ""}`}
                    onClick={() => setAll(item.id, !everyone)}
                  >
                    {t("assign.all")}
                  </button>
                  {people.map((person) => {
                    const on = item.assignedTo.includes(person.id);
                    const colorIndex = colorOf(person.id);
                    return (
                      <button
                        key={person.id}
                        className={`who__chip ${on ? "on" : ""}`}
                        style={
                          on
                            ? { background: personColor(colorIndex), color: personInk(colorIndex), borderColor: "transparent" }
                            : undefined
                        }
                        onClick={() => toggle(item.id, person.id)}
                      >
                        <span
                          className="avatar who__av"
                          style={{ background: personColor(colorIndex), color: personInk(colorIndex) }}
                        >
                          {on ? <Check size={13} /> : initials(person.name)}
                        </span>
                        <span className="truncate">{person.name || "—"}</span>
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
                        onClick={() => setCountEach(item.id, false)}
                      >
                        {t("assign.modeShared")}
                      </button>
                      <button
                        className={`seg__btn ${counting ? "on" : ""}`}
                        aria-pressed={counting}
                        onClick={() => setCountEach(item.id, true)}
                      >
                        {t("assign.modeEach")}
                      </button>
                    </div>
                    {counting ? (
                      <div className="muted units__hint">
                        {t("assign.howMany", { counted, qty: item.qty })}
                      </div>
                    ) : null}
                    {counting && assignees.map((person) => {
                      const unitCount = unitsOf(item, person.id);
                      return (
                        <div className="row between units__row" key={person.id}>
                          <span className="truncate units__name">{person.name || "—"}</span>
                          <div className="units__step">
                            <button
                              className="units__btn"
                              aria-label={t("assign.less", { name: person.name || "—" })}
                              disabled={unitCount <= 1}
                              onClick={() => step(item.id, person.id, -1)}
                            >
                              <Minus size={15} />
                            </button>
                            <span className="units__n tnum">{unitCount}</span>
                            <button
                              className="units__btn"
                              aria-label={t("assign.more", { name: person.name || "—" })}
                              disabled={counted >= item.qty}
                              onClick={() => step(item.id, person.id, 1)}
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
