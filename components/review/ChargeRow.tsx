"use client";

import { clampNum } from "@/lib/util";

export default function ChargeRow({
  label,
  value,
  onChange,
  prefix,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="row between charge">
      <span className="charge__label">{label}</span>
      <div className="charge__input">
        {prefix ? <span className="muted">{prefix}</span> : null}
        <input
          className="charge__in tnum"
          inputMode="decimal"
          value={value || ""}
          placeholder="0"
          onChange={(e) => onChange(clampNum(e.target.value))}
        />
        {suffix ? <span className="muted">{suffix}</span> : null}
      </div>
    </div>
  );
}
