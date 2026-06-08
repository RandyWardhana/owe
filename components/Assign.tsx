"use client";

import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { fmtMoney } from "@/lib/currency";
import { lineTotal } from "@/lib/calc";
import { buzz, initials, personColor, personInk } from "@/lib/util";

import Screen from "./Screen";
import { ArrowRight, Check } from "./icons";

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
        return {
          ...it,
          assignedTo: has
            ? it.assignedTo.filter((a) => a !== personId)
            : [...it.assignedTo, personId],
        };
      }),
    }));
  };

  const setAll = (itemId: string, all: boolean) => {
    buzz(6);
    updateDraft((d) => ({
      ...d,
      items: d.items.map((it) =>
        it.id === itemId
          ? { ...it, assignedTo: all ? d.people.map((p) => p.id) : [] }
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
            const each = it.assignedTo.length > 1 ? lineTotal(it) / it.assignedTo.length : 0;
            return (
              <div className="card assign-item" key={it.id} style={{ ["--i" as string]: i }}>
                <div className="row between assign-item__head">
                  <div className="grow">
                    <div className="assign-item__name truncate">
                      {it.name || t("common.item")}
                      {it.qty > 1 ? <span className="muted"> ×{it.qty}</span> : null}
                    </div>
                    {each > 0 ? (
                      <div className="muted assign-item__each">
                        {t("assign.each", { amount: fmtMoney(each, currency) })}
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
              </div>
            );
          })}
        </div>
      </div>
    </Screen>
  );
}
