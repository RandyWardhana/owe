"use client";

import type { ReactNode } from "react";

import { useStore } from "@/lib/store";
import { buzz } from "@/lib/util";

import { Back } from "./icons";

export interface StepsInfo {
  current: number;
  total: number;
}

export default function Screen({
  title,
  sub,
  onBack,
  right,
  steps,
  footer,
  overlay,
  children,
}: {
  title?: ReactNode;
  sub?: ReactNode;
  onBack?: () => void;
  right?: ReactNode;
  steps?: StepsInfo;
  footer?: ReactNode;
  overlay?: ReactNode;
  children: ReactNode;
}) {
  const dir = useStore((s) => s.dir);
  const back = useStore((s) => s.back);
  const stack = useStore((s) => s.stack);

  const showBack = onBack !== undefined || stack.length > 0;

  return (
    <>
    <div className={`screen ${dir === "back" ? "route-back" : "route-enter"}`}>
      {(title || showBack || right) && (
        <div className="topbar">
          {showBack ? (
            <button
              className="iconbtn"
              aria-label="back"
              onClick={() => {
                buzz(6);
                (onBack || back)();
              }}
            >
              <Back size={20} />
            </button>
          ) : null}
          <div className="grow">
            {title ? <h1 className="truncate">{title}</h1> : null}
            {sub ? <div className="sub">{sub}</div> : null}
          </div>
          {right}
        </div>
      )}

      {steps ? (
        <div className="steps">
          {Array.from({ length: steps.total }).map((_, i) => (
            <i key={i} className={i < steps.current ? "on" : ""} />
          ))}
        </div>
      ) : null}

      <div className="screen__scroll">{children}</div>

      {footer ? <div className="footer-cta">{footer}</div> : null}
    </div>
    {overlay}
    </>
  );
}
