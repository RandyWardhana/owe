"use client";

import { useRef, useState } from "react";

import { useT } from "@/lib/i18n";
import { initials, personColor, personInk } from "@/lib/util";
import type { SharedBillPerson } from "@/lib/types";

import { Check, Chevron, Trash } from "@/components/icons";
import { PROOF_TYPES } from "@/lib/proofs";
import AnimatedMoney from "@/components/ui/AnimatedMoney";
import CopyButton from "@/components/ui/CopyButton";
import PersonItems from "@/components/ui/PersonItems";

interface Props {
  person: SharedBillPerson;
  index: number;
  currency: string;
  isPayer: boolean;
  isPaid: boolean;
  payerName: string;
  onToggle: () => void;
  copyText: string;
  /* Settlement. A guest attaches a receipt; only the creator turns a row green. */
  isOwner?: boolean;
  hasProof?: boolean;
  uploading?: boolean;
  onProof?: (file: File) => void;
  onViewProof?: () => void;
  onRemoveProof?: () => void;
  proofSrc?: string;
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
  isOwner = false,
  hasProof = false,
  uploading = false,
  onProof,
  onViewProof,
  onRemoveProof,
  proofSrc,
}: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);

  const settled = isPaid && !isPayer;
  const items = person.items;
  const hasItems = items.length > 0;

  const fileInput = useRef<HTMLInputElement | null>(null);
  const [thumbFailed, setThumbFailed] = useState(false);

  const meta = isPayer
    ? t("shared.paidBill")
    : isPaid
      ? t("breakdown.paid")
      : t("shared.owes", { name: payerName });

  const thumb =
    hasProof && proofSrc && !thumbFailed ? (
      <button
        className="settle__thumb"
        onClick={onViewProof}
        aria-label={t("shared.viewProof")}
      >
        {/* A receipt can fail to load: deleted in another tab, a flaky
            connection. Falling back to wording beats a broken-image glyph. */}
        <img src={proofSrc} alt="" onError={() => setThumbFailed(true)} />
      </button>
    ) : null;

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
          {settled ? <Check size={16} className="pp__check" /> : initials(person.name)}
        </span>
        <div style={{ minWidth: 0 }}>
          <div className="pp__name truncate">{person.name || "—"}</div>
          <div className="muted pp__meta">{meta}</div>
        </div>
      </div>
      <div
        className={`pp__total disp tnum ${isPayer ? "is-payer" : ""} ${settled ? "is-struck" : ""}`}
      >
        <AnimatedMoney value={person.total} currency={currency} />
      </div>
    </div>
  );

  return (
    <div
      className={`card pp ${settled ? "is-paid" : ""}`}
      style={{ ["--i" as string]: index }}
    >
      <div className="pp--row">
        {isPayer || !hasItems ? (
          <div className="pp__tap">{body}</div>
        ) : (
          <button
            className="pp__tap tappable"
            aria-expanded={open}
            onClick={() => setOpen((isOpen) => !isOpen)}
            aria-label={t("breakdown.viewItems", { name: person.name || "—" })}
          >
            {body}
          </button>
        )}
        <div className="pp__end">
          {hasItems ? (
            <button
              className="pp__copy"
              aria-label={t("breakdown.viewItems", { name: person.name || "—" })}
              aria-expanded={open}
              onClick={() => setOpen((isOpen) => !isOpen)}
            >
              <Chevron size={16} className={`pp__chev ${open ? "open" : ""}`} />
            </button>
          ) : null}
          <CopyButton
            text={copyText}
            label={t("breakdown.copyShare", { name: person.name || "—" })}
          />
        </div>
      </div>

      {!isPayer && !isOwner ? (
        <input
          ref={fileInput}
          type="file"
          accept={PROOF_TYPES.join(",")}
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && onProof) onProof(file);
            e.target.value = "";
          }}
        />
      ) : null}

      {hasItems ? (
        <div className={`pp__drawer ${open ? "open" : ""}`}>
          <div>
            <PersonItems items={items} currency={currency} />
          </div>
        </div>
      ) : null}

      {isPayer ? null : (
        <div className="pp__settle">
          {isOwner ? (
            <>
              {thumb}
              {hasProof && (!proofSrc || thumbFailed) ? (
                <span className="settle__note">{t("shared.proofReceived")}</span>
              ) : null}
              {hasProof ? (
                <button
                  className="settle__icon"
                  onClick={onRemoveProof}
                  aria-label={t("shared.proofRemove")}
                  title={t("shared.proofRemove")}
                >
                  <Trash size={16} />
                </button>
              ) : null}
              <button
                className={`settle__btn ${isPaid ? "settle__btn--ghost" : "settle__btn--go"}`}
                onClick={onToggle}
              >
                {isPaid
                  ? t("shared.undoPaid")
                  : hasProof
                    ? t("shared.confirmReceipt")
                    : t("shared.markPaid")}
              </button>
            </>
          ) : isPaid ? (
            <>
              {thumb}
              <span className="settle__note settle__note--done">
                {t("shared.confirmedByPayer", { name: payerName })}
              </span>
            </>
          ) : (
            <>
              {thumb}
              <span className="settle__note">
                {uploading
                  ? t("shared.proofUploading")
                  : hasProof
                    ? t("shared.proofWaiting")
                    : t("shared.proofPrompt")}
              </span>
              {/* {hasProof ? (
                <button
                  className="settle__icon"
                  onClick={onRemoveProof}
                  disabled={uploading}
                  aria-label={t("shared.proofRemove")}
                  title={t("shared.proofRemove")}
                >
                  <Trash size={16} />
                </button>
              ) : null} */}
              <button
                className={`settle__btn ${hasProof ? "settle__btn--ghost" : "settle__btn--go"}`}
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
              >
                {hasProof ? t("shared.proofReplace") : t("shared.proofUpload")}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
