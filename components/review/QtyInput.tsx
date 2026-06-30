"use client";

import { useEffect, useState } from "react";

export default function QtyInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (qty: number) => void;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText((prev) => (Number(prev) === value ? prev : String(value)));
  }, [value]);

  return (
    <input
      className="qtybox__in tnum"
      inputMode="numeric"
      value={text}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d]/g, "");
        setText(raw);
        const parsed = parseInt(raw, 10);
        if (Number.isFinite(parsed) && parsed > 0) onChange(parsed);
      }}
      onBlur={() => {
        const parsed = parseInt(text, 10);
        const fixed = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
        setText(String(fixed));
        onChange(fixed);
      }}
    />
  );
}
