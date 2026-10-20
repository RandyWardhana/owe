"use client";

import { useT } from "@/lib/i18n";
import { fmtMoney } from "@/lib/currency";
import { initials, personColor, personInk } from "@/lib/util";
import type { ReceiptPaperProps } from "@/entities/props/desk";

import ReceiptFrame, { ReceiptField } from "./ReceiptFrame";

const MAX_DOTS = 4;

export default function ReceiptPaper({ receipt, heading, status, showStubs = false, note }: ReceiptPaperProps) {
  const t = useT();
  const money = (amount: number) => fmtMoney(amount, receipt.currency);
  const date = receipt.date
    ? new Date(receipt.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : null;
  const sharing = receipt.stubs.filter((stub) => stub.amount > 0);
  const stubs = showStubs ? sharing : [];

  return (
    <article className="rp" aria-label={t("desk.receipt.aria", { title: receipt.title || t("shared.defaultTitle") })}>
      <ReceiptFrame
        seed={receipt.id}
        heading={heading}
        status={status}
        note={note ?? t("desk.receipt.note")}
        lead={
          <>
            <span className="rp__lead-label">{t("desk.receipt.total")}</span>
            <span className="rp__amount disp tnum">{money(receipt.total)}</span>
          </>
        }
      >
        <dl className="rp__fields">
          <ReceiptField label={t("desk.receipt.bill")}>{receipt.title || t("shared.defaultTitle")}</ReceiptField>
          {date ? <ReceiptField label={t("desk.receipt.date")}>{date}</ReceiptField> : null}
          {receipt.payerName ? (
            <ReceiptField label={t("desk.receipt.paidByLabel")}>{receipt.payerName}</ReceiptField>
          ) : null}
          {sharing.length ? (
            <ReceiptField label={t("desk.receipt.splitBetween")}>
              {t("desk.receipt.peopleCount", { n: sharing.length })}
            </ReceiptField>
          ) : null}
        </dl>

        {receipt.lines.length ? (
          <div className="rp__items">
            <span className="rp__section">{t("desk.receipt.items")}</span>
            <ol className="rp__lines">
              {receipt.lines.map((line, index) => (
                <li key={line.key} className="rp__line" style={{ ["--i" as string]: index }}>
                  <span className="rp__name">
                    <span className="rp__qty tnum">{line.qty}×</span>
                    <span className="truncate">{line.name || t("common.item")}</span>
                    {line.people.length ? (
                      <span className="rp__dots" aria-hidden="true">
                        {line.people.slice(0, MAX_DOTS).map((person) => (
                          <i
                            key={person.colorIndex}
                            title={person.name}
                            style={{ background: personColor(person.colorIndex) }}
                          />
                        ))}
                        {line.people.length > MAX_DOTS ? <b>+{line.people.length - MAX_DOTS}</b> : null}
                      </span>
                    ) : null}
                  </span>
                  <span className="rp__amt tnum">{money(line.amount)}</span>
                </li>
              ))}
            </ol>
            <dl className="rp__sums">
              <div>
                <dt>{t("desk.receipt.subtotal")}</dt>
                <dd className="tnum">{money(receipt.subtotal)}</dd>
              </div>
              {receipt.charges.map((charge) => (
                <div key={charge.key}>
                  <dt>{t(`desk.receipt.${charge.key}`)}</dt>
                  <dd className="tnum">{money(charge.amount)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : receipt.total > 0 ? null : (
          <div className="rp__empty">
            <i />
            <i />
            <i />
            <span>{t("desk.receipt.noItems")}</span>
          </div>
        )}
      </ReceiptFrame>

      {stubs.length ? (
        <div className="rp__stubs">
          <p className="rp__tear">{t("desk.receipt.tearHint")}</p>
          {stubs.map((stub, index) => (
            <div
              key={stub.key}
              className={`rp__stub${stub.paid ? " is-paid" : ""}`}
              style={{ ["--i" as string]: index }}
            >
              <span
                className="avatar rp__stub-av"
                style={{ background: personColor(stub.colorIndex), color: personInk(stub.colorIndex) }}
              >
                {initials(stub.name)}
              </span>
              <span className="rp__stub-name">
                <b className="truncate">{stub.name}</b>
                <small>
                  {stub.isPayer
                    ? t("desk.receipt.stubPayer")
                    : stub.paid
                      ? t("desk.receipt.stubPaid")
                      : t("desk.receipt.stubOwes")}
                </small>
              </span>
              <span className="rp__stub-amt tnum disp">{money(stub.amount)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}
