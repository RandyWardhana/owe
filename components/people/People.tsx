"use client";

import { useEffect, useState } from "react";

import { useStore } from "@/lib/store";
import { accountsFor, contacts, isKnown } from "@/lib/addressBook";
import type { Contact } from "@/entities/contact";
import SavedPeopleSheet from "./SavedPeopleSheet";
import { useT } from "@/lib/i18n";
import { buzz, uid, initials, personColor, personInk } from "@/lib/util";
import type { Person } from "@/entities/bill";

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
  const editing = people.find((person) => person.id === payFor) || null;

  const closePayments = () => {
    if (editing?.accounts.some((account) => !account.value.trim())) {
      buzz(12);
      showToast("payment.emptyError");
      return;
    }
    setPayFor(null);
  };

  const addPerson = () => {
    buzz(8);
    updateDraft((draft) => ({
      ...draft,
      people: [...draft.people, { id: uid(), name: "", accounts: [] }],
    }));
  };

  const setPerson = (id: string, patch: Partial<Person>) =>
    updateDraft((draft) => ({
      ...draft,
      people: draft.people.map((person) => (person.id === id ? { ...person, ...patch } : person)),
    }));

  // Typing a remembered name fills accounts only when this person has none yet,
  // so it never overwrites what was entered by hand.
  const nameChanged = (person: Person, name: string) => {
    const saved = person.accounts.length ? [] : accountsFor(name);
    setPerson(person.id, saved.length ? { name, accounts: saved } : { name });
  };

  const addSaved = (contact: Contact) => {
    buzz(8);
    updateDraft((draft) => {
      const blank = draft.people.find((person) => !person.name.trim() && !person.accounts.length);
      const filled = {
        id: blank ? blank.id : uid(),
        name: contact.name,
        accounts: accountsFor(contact.name),
      };
      return {
        ...draft,
        people: blank
          ? draft.people.map((person) => (person.id === blank.id ? filled : person))
          : [...draft.people, filled],
      };
    });
  };

  const delPerson = (id: string) => {
    buzz(6);
    updateDraft((draft) => ({
      ...draft,
      people: draft.people.filter((person) => person.id !== id),
      items: draft.items.map((item) => ({
        ...item,
        assignedTo: item.assignedTo.filter((assigneeId) => assigneeId !== id),
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
          disabled={people.filter((person) => person.name.trim()).length < 2}
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
            {people.map((person, i) => (
              <div className="card person" key={person.id} style={{ ["--i" as string]: i }}>
                <span
                  className="avatar person__av"
                  style={{ background: personColor(i), color: personInk(i) }}
                >
                  {initials(person.name)}
                </span>
                <div className="grow">
                  <input
                    className="person__name"
                    value={person.name}
                    placeholder={t("people.addName")}
                    autoFocus={i === people.length - 1 && !person.name}
                    onChange={(e) => nameChanged(person, e.target.value)}
                  />
                  <button className="person__pay" onClick={() => setPayFor(person.id)}>
                    <Wallet size={14} />
                    <span>
                      {person.accounts.length === 0 && isKnown(person.name)
                        ? t("people.savedDetails")
                        : payLabel(person.accounts.length)}
                    </span>
                    <Chevron size={14} />
                  </button>
                </div>
                <button
                  className="iconbtn ghost"
                  aria-label="remove"
                  onClick={() => delPerson(person.id)}
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
