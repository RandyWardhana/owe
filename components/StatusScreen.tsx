"use client";

import Link from "next/link";

import { useT } from "@/lib/i18n";
import { buzz } from "@/lib/util";

import type { StatusLinkProps, StatusScreenProps } from "@/entities/props/ui";

export default function StatusScreen({ icon, tone = "neutral", title, body, actions, children }: StatusScreenProps) {
  const t = useT();

  return (
    <div className="status">
      <div className="status__card">
        <Link className="status__brand disp" href="/">
          {t("app.name")}
        </Link>
        <div className={`status__mark status__mark--${tone}`} aria-hidden="true">
          {icon}
        </div>
        <h1 className="status__title">{title}</h1>
        <p className="status__body">{body}</p>
        {actions ? <div className="status__actions">{actions}</div> : null}
        {children}
      </div>
    </div>
  );
}

export function StatusLink({ href, children, variant = "primary" }: StatusLinkProps) {
  return (
    <a className={`btn${variant === "secondary" ? " secondary" : ""}`} href={href} onClick={() => buzz(6)}>
      {children}
    </a>
  );
}
