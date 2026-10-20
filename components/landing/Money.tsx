"use client";

import { useEffect, useRef, useState } from "react";

import { usePlayful } from "./motion";
import type { MoneyProps } from "@/entities/props/landing";

const rupiah = (amount: number) => "Rp " + Math.round(amount).toLocaleString("id-ID");

export default function Money({
  value,
  className = "",
  duration = 480,
}: MoneyProps) {
  const play = usePlayful();
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const frame = useRef(0);

  useEffect(() => {
    if (!play) {
      setShown(value);
      return;
    }

    const start = performance.now();
    const origin = from.current;
    const delta = value - origin;
    if (delta === 0) return;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setShown(origin + delta * eased);
      if (progress < 1) frame.current = requestAnimationFrame(tick);
      else from.current = value;
    };

    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [value, duration, play]);

  useEffect(() => {
    if (!play) from.current = value;
  }, [value, play]);

  return <span className={`tnum ${className}`}>{rupiah(shown)}</span>;
}
