"use client";

import { useEffect, useState } from "react";

export default function QtyInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const [str, setStr] = useState(String(value));

  useEffect(() => {
    setStr((prev) => (Number(prev) === value ? prev : String(value)));
  }, [value]);

  return (
    <input
      className="qtybox__in tnum"
      inputMode="numeric"
      value={str}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d]/g, "");
        setStr(raw);
        const n = parseInt(raw, 10);
        if (Number.isFinite(n) && n > 0) onChange(n);
      }}
      onBlur={() => {
        const n = parseInt(str, 10);
        const fixed = Number.isFinite(n) && n > 0 ? n : 1;
        setStr(String(fixed));
        onChange(fixed);
      }}
    />
  );
}
