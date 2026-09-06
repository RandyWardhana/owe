"use client";

import { useEffect, useState } from "react";

import { useStore } from "@/lib/store";
import { accountsFor, contacts, isKnown, type Contact } from "@/lib/addressBook";
import SavedPeopleSheet from "./SavedPeopleSheet";
import { useT } from "@/lib/i18n";
import { buzz, uid, initials, personColor, personInk } from "@/lib/util";
import type { Person } from "@/lib/types";

import Screen from "@/components/Screen";
import Sheet from "@/components/Sheet";
import { Plus, Trash, ArrowRight, Wallet, Chevron, Users } from "@/components/icons";
import PaymentEditor from "./PaymentEditor";

export default function People() {
  const t = useT();
  const draft = useStore((s) => s.draft);
  const updateDraft = useStore((s) => s.updateDraft);
  const showToast = useStore((s) => s.showToast);
  const go = useStore((s) => s.go);

  const [payFor, setPayFor] = useState<string | null>(null);
  const [pickOpen, setPickOpen] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  // localStorage read, so after mount: the server render must not disagree.
  useEffect(() => setHasSaved(contacts().length > 0), [pickOpen]);
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

  // Picking a remembered person brings their accounts with them. Typing a name
  // only fills when this person has none yet, so it can never overwrite what
  // was just entered by hand.
  const nameChanged = (person: Person, name: string) => {
    // Typing a remembered name still fills, for anyone who knows it by heart --
    // but only into a person who has no accounts yet.
    const saved = person.accounts.length ? [] : accountsFor(name);
    setPerson(person.id, saved.length ? { name, accounts: saved } : { name });
  };

  const addSaved = (contact: Contact) => {
    buzz(8);
    updateDraft((d) => {
      const blank = d.people.find((person) => !person.name.trim() && !person.accounts.length);
      const filled = {
        id: blank ? blank.id : uid(),
        name: contact.name,
        accounts: accountsFor(contact.name),
      };
      return {
        ...d,
        people: blank
          ? d.people.map((person) => (person.id === blank.id ? filled : person))
          : [...d.people, filled],
      };
    });
  };

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
      overlay={
        <>
        <SavedPeopleSheet
          open={pickOpen}
          onClose={() => setPickOpen(false)}
          onPick={addSaved}
          taken={people.map((person) => person.name)}
        />
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
        </>
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
                    onChange={(e) => nameChanged(p, e.target.value)}
                  />
                  <button className="person__pay" onClick={() => setPayFor(p.id)}>
                    <Wallet size={14} />
                    <span>
                      {p.accounts.length === 0 && isKnown(p.name)
                        ? t("people.savedDetails")
                        : payLabel(p.accounts.length)}
                    </span>
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

        <div className="row" style={{ gap: 10, marginTop: 12 }}>
          <button className="btn secondary" style={{ width: "auto", flex: 1 }} onClick={addPerson}>
            <Plus size={18} /> {t("people.addName")}
          </button>
          {hasSaved ? (
            <button
              className="btn secondary"
              style={{ width: "auto", flex: 1 }}
              onClick={() => {
                buzz(6);
                setPickOpen(true);
              }}
            >
              <Users size={18} /> {t("people.savedCta")}
            </button>
          ) : null}
        </div>
      </div>
    </Screen>
  );
}
