"use client";

import { useEffect, useMemo, useState } from "react";

import { useT } from "@/lib/i18n";
import { contacts, forget, type Contact } from "@/lib/addressBook";
import { methodMeta } from "@/lib/payments";
import { initials, personColor, personInk } from "@/lib/util";

import Sheet from "@/components/Sheet";
import { Trash, Users } from "@/components/icons";

/* Picking someone you have split with before.
   This replaced a dropdown under the name field. A popup is fine for three
   contacts and useless for thirty: it cannot be scrolled comfortably, it fights
   the card stacking around it, and on a phone it covers the thing you are
   typing into. A sheet is the pattern the rest of this app already uses for
   choices with an open-ended number of options. */

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (contact: Contact) => void;
  /* Names already on this bill — shown, but not pickable twice. */
  taken: string[];
}

export default function SavedPeopleSheet({ open, onClose, onPick, taken }: Props) {
  const t = useT();
  const [all, setAll] = useState<Contact[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) {
      setAll(contacts());
      setQuery("");
    }
  }, [open]);

  const alreadyOnBill = useMemo(
    () => new Set(taken.map((n) => n.trim().toLowerCase()).filter(Boolean)),
    [taken],
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.accounts.some((a) => a.value.toLowerCase().includes(q)),
    );
  }, [all, query]);

  const drop = (name: string) => {
    forget(name);
    setAll(contacts());
  };

  return (
    <Sheet open={open} onClose={onClose} title={t("people.savedTitle")}>
      {all.length > 6 ? (
        <input
          className="input saved__search"
          value={query}
          placeholder={t("people.savedSearch")}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
      ) : null}

      {shown.length === 0 ? (
        <div className="card empty saved__empty">
          <Users size={24} />
          <p className="muted">
            {all.length === 0 ? t("people.savedEmpty") : t("people.savedNoMatch")}
          </p>
        </div>
      ) : (
        <ul className="saved__list">
          {shown.map((contact, i) => {
            const used = alreadyOnBill.has(contact.name.trim().toLowerCase());
            return (
              <li key={contact.name} className="saved__row">
                <button
                  type="button"
                  className="saved__pick"
                  disabled={used}
                  onClick={() => {
                    onPick(contact);
                    onClose();
                  }}
                >
                  <span
                    className="avatar saved__av"
                    style={{ background: personColor(i), color: personInk(i) }}
                  >
                    {initials(contact.name)}
                  </span>
                  <span className="saved__body">
                    <span className="saved__name">{contact.name}</span>
                    <span className="saved__meta">
                      {used
                        ? t("people.savedAlready")
                        : contact.accounts
                            .map((a) => `${methodMeta(a.key).label} ${a.value}`)
                            .join(" · ")}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className="iconbtn ghost saved__forget"
                  aria-label={t("people.savedForget", { name: contact.name })}
                  onClick={() => drop(contact.name)}
                >
                  <Trash size={17} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}
