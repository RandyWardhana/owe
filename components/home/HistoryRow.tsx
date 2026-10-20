"use client";

import { useT } from "@/lib/i18n";
import { fmtMoney } from "@/lib/currency";
import { initials, personColor, personInk } from "@/lib/util";

import { Trash } from "@/components/icons";
import type { HistoryRowProps } from "@/entities/props/home";

export default function HistoryRow({
  draft,
  index,
  currency,
  onOpen,
  onDelete,
}: HistoryRowProps) {
  const t = useT();
  const total = draft.summary?.grandTotal ?? 0;
  const date = new Date(draft.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="card hist" style={{ ["--i" as string]: index }}>
      <button className="hist__open tappable" onClick={onOpen}>
      <div className="hist__avatars">
        {draft.people.slice(0, 3).map((person, personIndex) => (
          <span
            key={person.id}
            className="avatar hist__av"
            style={{
              background: personColor(personIndex),
              color: personInk(personIndex),
              marginLeft: personIndex ? -10 : 0,
            }}
          >
            {initials(person.name)}
          </span>
        ))}
      </div>
      <div className="grow" style={{ textAlign: "left" }}>
        <div className="hist__title truncate">{draft.title || t("shared.defaultTitle")}</div>
        <div className="muted hist__meta">
          {date} · {t("home.peopleCount", { n: draft.people.length })}
        </div>
      </div>
        <div className="hist__total disp tnum">{fmtMoney(total, draft.currency || currency)}</div>
      </button>
      <button
        className="iconbtn ghost hist__del"
        aria-label={t("home.deleteBill", { name: draft.title || t("shared.defaultTitle") })}
        onClick={onDelete}
      >
        <Trash size={17} />
      </button>
    </div>
  );
}
