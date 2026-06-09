"use client";

import { clampNum } from "@/lib/util";
import type { ChargeMode } from "@/lib/types";

export default function ChargeRow({
  label,
  value,
  onChange,
  prefix,
  suffix,
  mode,
  onModeChange,
  sym,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;

  mode?: ChargeMode;
  onModeChange?: (m: ChargeMode) => void;
  sym?: string;
}) {
  const isPct = mode === "pct";
  const showToggle = mode !== undefined && !!onModeChange;

  return (
    <div className="row between charge">
      <span className="charge__label">{label}</span>
      <div className="charge__right">
        <div className="charge__input">
          {showToggle ? (
            isPct ? null : <span className="muted">{sym}</span>
          ) : prefix ? (
            <span className="muted">{prefix}</span>
          ) : null}
          <input
            className="charge__in tnum"
            inputMode="decimal"
            value={value || ""}
            placeholder="0"
            onFocus={(e) => e.target.select()}
            onChange={(e) => onChange(clampNum(e.target.value))}
          />
          {showToggle ? (
            isPct ? <span className="muted">%</span> : null
          ) : suffix ? (
            <span className="muted">{suffix}</span>
          ) : null}
        </div>
        {showToggle ? (
          <div className="charge-toggle">
            <button
              type="button"
              className={isPct ? "on" : ""}
              onClick={() => onModeChange!("pct")}
            >
              %
            </button>
            <button
              type="button"
              className={!isPct ? "on" : ""}
              onClick={() => onModeChange!("amt")}
            >
              {sym}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
