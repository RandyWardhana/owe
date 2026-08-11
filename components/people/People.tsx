"use client";

import { useRef, useState } from "react";

import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { cloneAccounts, contactKey, findContact } from "@/lib/contacts";
import { buzz, uid, initials, personColor, personInk } from "@/lib/util";
import type { Contact, Person } from "@/lib/types";

import Screen from "@/components/Screen";
import Sheet from "@/components/Sheet";
import { Plus, Trash, ArrowRight, Wallet, Chevron, X } from "@/components/icons";
import PaymentEditor from "./PaymentEditor";

export default function People() {
  const t = useT();
  const draft = useStore((s) => s.draft);
  const contacts = useStore((s) => s.contacts);
  const updateDraft = useStore((s) => s.updateDraft);
  const rememberPeople = useStore((s) => s.rememberPeople);
  const forgetContact = useStore((s) => s.forgetContact);
  const showToast = useStore((s) => s.showToast);
  const go = useStore((s) => s.go);

  const [payFor, setPayFor] = useState<string | null>(null);
  // person id → the saved person their details were autofilled from, so typing
  // past a match ("Pak Arif" → "Pak Arifin") takes the details back out again.
  const autofilled = useRef<Record<string, string>>({});
  const people = draft.people;
  const editing = people.find((p) => p.id === payFor) || null;

  // Saved people not already at this table.
  const onBill = new Set(people.map((p) => contactKey(p.name)).filter(Boolean));
  const suggestions = contacts.filter((c) => !onBill.has(contactKey(c.name)));

  const closePayments = () => {
    if (editing?.accounts.some((a) => !a.value.trim())) {
      buzz(12);
      showToast("payment.emptyError");
      return;
    }
    // Payment details are worth remembering the moment they're entered — the
    // bill may never get locked in.
    if (editing) {
      rememberPeople([editing]);
      // Hand-edited details are no longer ours to take back on a rename.
      delete autofilled.current[editing.id];
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

  /** Adds a saved person, payment details and all. */
  const addContact = (contact: Contact) => {
    buzz(8);
    updateDraft((d) => ({
      ...d,
      people: [
        ...d.people,
        { id: uid(), name: contact.name, accounts: cloneAccounts(contact.accounts) },
      ],
    }));
  };

  const setPerson = (id: string, patch: Partial<Person>) =>
    updateDraft((d) => ({
      ...d,
      people: d.people.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));

  /**
   * Typing a name we've seen before pulls that person's payment details in —
   * but never over details already entered on this bill.
   */
  const renamePerson = (person: Person, name: string) => {
    const from = autofilled.current[person.id];
    // Details we put there ourselves come back out once the name moves on.
    const stale = from && from !== contactKey(name);
    const accounts = stale ? [] : person.accounts;
    if (stale) delete autofilled.current[person.id];

    const match = accounts.length ? null : findContact(contacts, name);
    if (match) autofilled.current[person.id] = contactKey(match.name);

    setPerson(person.id, {
      name,
      ...(match
        ? { accounts: cloneAccounts(match.accounts) }
        : stale
          ? { accounts }
          : {}),
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
                    onChange={(e) => renamePerson(p, e.target.value)}
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

        {suggestions.length ? (
          <div className="saved">
            <p className="label">{t("people.saved")}</p>
            <p className="muted set-hint">{t("people.savedHint")}</p>
            <div className="saved__grid">
              {suggestions.map((contact) => (
                <span className="chip saved__chip" key={contact.id}>
                  <button
                    className="saved__add"
                    onClick={() => addContact(contact)}
                  >
                    <Plus size={14} />
                    <span className="truncate">{contact.name}</span>
                    {contact.accounts.length ? (
                      <Wallet size={13} className="saved__wallet" />
                    ) : null}
                  </button>
                  <button
                    className="saved__forget"
                    aria-label={t("people.forget", { name: contact.name })}
                    onClick={() => {
                      buzz(6);
                      forgetContact(contact.id);
                    }}
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Screen>
  );
}
