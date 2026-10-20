"use client";

import type { ReactNode } from "react";

import { buzz } from "@/lib/util";

export default function StatusScreen({
  icon,
  tone = "neutral",
  title,
  body,
  actions,
  children,
}: {
  icon: ReactNode;
  tone?: "neutral" | "warn";
  title: string;
  body: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="status">
      <div className="status__card">
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

export function StatusLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <a
      className={`btn${variant === "secondary" ? " secondary" : ""}`}
      href={href}
      onClick={() => buzz(6)}
    >
      {children}
    </a>
  );
}
