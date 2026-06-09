"use client";

import { useState } from "react";

import { useT } from "@/lib/i18n";
import { initials, personColor, personInk } from "@/lib/util";
import type { SharePayload } from "@/lib/types";

import { Check, Chevron } from "@/components/icons";
import AnimatedMoney from "@/components/ui/AnimatedMoney";
import CopyButton from "@/components/ui/CopyButton";
import PersonItems from "@/components/ui/PersonItems";

type SharedPerson = SharePayload["pp"][number];

interface Props {
  person: SharedPerson;
  index: number;
  currency: string;
  isPayer: boolean;
  isPaid: boolean;
  payerName: string;
  onToggle: () => void;
  copyText: string;
}

export default function SharedPersonRow({
  person,
  index,
  currency,
  isPayer,
  isPaid,
  payerName,
  onToggle,
  copyText,
}: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);

  const settled = isPaid && !isPayer;
  const items = (person.it || []).map((i) => ({
    name: i.n,
    qty: i.q,
    share: i.s,
    split: i.sp,
  }));
  const hasItems = items.length > 0;

  const meta = isPayer
    ? t("shared.paidBill")
    : isPaid
      ? t("breakdown.paid")
      : t("shared.owes", { name: payerName });

  const body = (
    <div className="row between">
      <div className="row" style={{ gap: 11, minWidth: 0 }}>
        <span
          className="avatar pp__av"
          style={
            settled
              ? { background: "var(--pos)", color: "#fff" }
              : { background: personColor(index), color: personInk(index) }
          }
        >
          {settled ? <Check size={16} className="pp__check" /> : initials(person.n)}
        </span>
        <div style={{ minWidth: 0 }}>
          <div className="pp__name truncate">{person.n || "—"}</div>
          <div className="muted pp__meta">{meta}</div>
        </div>
      </div>
      <div
        className={`pp__total disp tnum ${isPayer ? "is-payer" : ""} ${settled ? "is-struck" : ""}`}
      >
        <AnimatedMoney value={person.t} currency={currency} />
      </div>
    </div>
  );

  return (
    <div
      className={`card pp ${settled ? "is-paid" : ""}`}
      style={{ ["--i" as string]: index }}
    >
      <div className="pp--row">
        {isPayer ? (
          <div className="pp__tap">{body}</div>
        ) : (
          <button
            className="pp__tap tappable"
            aria-pressed={isPaid}
            onClick={onToggle}
          >
            {body}
          </button>
        )}
        <div className="pp__end">
          {hasItems ? (
            <button
              className="pp__copy"
              aria-label={t("breakdown.viewItems", { name: person.n || "—" })}
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              <Chevron size={16} className={`pp__chev ${open ? "open" : ""}`} />
            </button>
          ) : null}
          <CopyButton
            text={copyText}
            label={t("breakdown.copyShare", { name: person.n || "—" })}
          />
        </div>
      </div>

      {hasItems ? (
        <div className={`pp__drawer ${open ? "open" : ""}`}>
          <div>
            <PersonItems items={items} currency={currency} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
