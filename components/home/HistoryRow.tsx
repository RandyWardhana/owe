"use client";

import { useT } from "@/lib/i18n";
import { fmtMoney } from "@/lib/currency";
import { initials, personColor, personInk } from "@/lib/util";
import type { Draft } from "@/lib/types";

import { Trash } from "@/components/icons";

export default function HistoryRow({
  draft,
  index,
  currency,
  onOpen,
  onDelete,
}: {
  draft: Draft;
  index: number;
  currency: string;
  onOpen: () => void;
  onDelete: () => void;
}) {
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
        {draft.people.slice(0, 3).map((p, k) => (
          <span
            key={p.id}
            className="avatar hist__av"
            style={{
              background: personColor(k),
              color: personInk(k),
              marginLeft: k ? -10 : 0,
            }}
          >
            {initials(p.name)}
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
