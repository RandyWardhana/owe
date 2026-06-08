"use client";

import { useState } from "react";

import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { buzz, uid, initials, personColor, personInk } from "@/lib/util";
import type { Person } from "@/lib/types";

import Screen from "@/components/Screen";
import Sheet from "@/components/Sheet";
import { Plus, Trash, ArrowRight, Wallet, Chevron } from "@/components/icons";
import PaymentEditor from "./PaymentEditor";

export default function People() {
  const t = useT();
  const draft = useStore((s) => s.draft);
  const updateDraft = useStore((s) => s.updateDraft);
  const showToast = useStore((s) => s.showToast);
  const go = useStore((s) => s.go);

  const [payFor, setPayFor] = useState<string | null>(null);
  const people = draft.people;
  const editing = people.find((p) => p.id === payFor) || null;

  const closePayments = () => {
    if (editing?.accounts.some((a) => !a.value.trim())) {
      buzz(12);
      showToast("payment.emptyError");
      return;
    }
    setPayFor(null);
  };

  const addPerson = () => {
    buzz(8);
    updateDraft((d) => ({
      ...d,
      people: [...d.people, { id: uid(), name: "", accounts: [] }],
    }));
  };

  const setPerson = (id: string, patch: Partial<Person>) =>
    updateDraft((d) => ({
      ...d,
      people: d.people.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));

  const delPerson = (id: string) => {
    buzz(6);
    updateDraft((d) => ({
      ...d,
      people: d.people.filter((p) => p.id !== id),
      items: d.items.map((it) => ({
        ...it,
        assignedTo: it.assignedTo.filter((a) => a !== id),
      })),
    }));
  };

  const payLabel = (count: number) =>
    count === 0
      ? t("people.addAccountHint")
      : count === 1
        ? t("people.wayToPay")
        : t("people.waysToPay", { n: count });

  return (
    <Screen
      title={t("people.title")}
      sub={t("people.sub")}
      steps={{ current: 2, total: 4 }}
      footer={
        <button
          className="btn"
          disabled={people.filter((p) => p.name.trim()).length < 2}
          onClick={() => {
            buzz(8);
            go("assign");
          }}
        >
          {t("people.next")} <ArrowRight size={20} />
        </button>
      }
    >
      <div className="pad">
        {people.length === 0 ? (
          <div className="card empty">
            <p className="muted">{t("people.empty")}</p>
          </div>
        ) : (
          <div className="col-gap stagger">
            {people.map((p, i) => (
              <div className="card person" key={p.id} style={{ ["--i" as string]: i }}>
                <span
                  className="avatar person__av"
                  style={{ background: personColor(i), color: personInk(i) }}
                >
                  {initials(p.name)}
                </span>
                <div className="grow">
                  <input
                    className="person__name"
                    value={p.name}
                    placeholder={t("people.addName")}
                    autoFocus={i === people.length - 1 && !p.name}
                    onChange={(e) => setPerson(p.id, { name: e.target.value })}
                  />
                  <button className="person__pay" onClick={() => setPayFor(p.id)}>
                    <Wallet size={14} />
                    <span>{payLabel(p.accounts.length)}</span>
                    <Chevron size={14} />
                  </button>
                </div>
                <button
                  className="iconbtn ghost"
                  aria-label="remove"
                  onClick={() => delPerson(p.id)}
                >
                  <Trash size={18} />
                </button>
              </div>
            ))}
          </div>
        )}

        <button className="btn secondary" style={{ marginTop: 12 }} onClick={addPerson}>
          <Plus size={18} /> {t("people.addName")}
        </button>
      </div>

      <Sheet
        open={!!editing}
        onClose={closePayments}
        title={editing ? t("payment.howToPay", { name: editing.name || "—" }) : ""}
      >
        {editing ? (
          <PaymentEditor
            person={editing}
            onChange={(accounts) => setPerson(editing.id, { accounts })}
          />
        ) : null}
      </Sheet>
    </Screen>
  );
}
