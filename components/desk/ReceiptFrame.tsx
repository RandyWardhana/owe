"use client";

import { useT } from "@/lib/i18n";
import type { ReceiptFieldProps, ReceiptFrameProps } from "@/entities/props/desk";

import ReceiptPattern from "./ReceiptPattern";

export function ReceiptField({ label, children }: ReceiptFieldProps) {
  return (
    <div className="rp__field">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export default function ReceiptFrame({ seed, heading, status, lead, note, children }: ReceiptFrameProps) {
  const t = useT();

  return (
    <div className="rp__frame">
      <div className="rp__top">
        <ReceiptPattern seed={`${seed}:top`} />
        <header className="rp__band">
          <div className="rp__band-text">
            <span className="rp__heading">{heading}</span>
            {status ? <span className={`rp__pill rp__pill--${status.tone}`}>{status.text}</span> : null}
          </div>
          <span className="rp__logo disp" aria-hidden="true">
            {t("app.name")}
          </span>
        </header>
        <div className="rp__lead">{lead}</div>
      </div>
      <div className="rp__body">
        <ReceiptPattern seed={`${seed}:body`} />
        {children}
        {note ? <p className="rp__note">{note}</p> : null}
      </div>
    </div>
  );
}
