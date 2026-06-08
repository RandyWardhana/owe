"use client";

import { useT } from "@/lib/i18n";
import { initials, personColor, personInk } from "@/lib/util";
import type { SharePayload } from "@/lib/types";

import { Check } from "@/components/icons";
import AnimatedMoney from "@/components/ui/AnimatedMoney";

type SharedPerson = SharePayload["pp"][number];

interface Props {
  person: SharedPerson;
  index: number;
  currency: string;
  isPayer: boolean;
  isPaid: boolean;
  payerName: string;
  onToggle: () => void;
}

export default function SharedPersonRow({
  person,
  index,
  currency,
  isPayer,
  isPaid,
  payerName,
  onToggle,
}: Props) {
  const t = useT();
  const settled = isPaid && !isPayer;
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
          style={{ background: personColor(index), color: personInk(index) }}
        >
          {settled ? <Check size={16} /> : initials(person.n)}
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

  const cls = `card pp pp--row ${settled ? "is-paid" : ""}`;

  if (isPayer) {
    return (
      <div className={cls} style={{ ["--i" as string]: index }}>
        {body}
      </div>
    );
  }
  return (
    <button
      className={`${cls} tappable`}
      style={{ ["--i" as string]: index }}
      aria-pressed={isPaid}
      onClick={onToggle}
    >
      {body}
    </button>
  );
}
