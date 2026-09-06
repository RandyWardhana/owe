"use client";

import { useEffect, useRef, useState } from "react";

import { usePlayful } from "./motion";

const rupiah = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");

/* A number that rolls to its new value instead of snapping.
   Every amount on this page changes as you play with it, and a figure that
   jumps gives no sense that your tap caused it. */
export default function Money({
  value,
  className = "",
  duration = 480,
}: {
  value: number;
  className?: string;
  duration?: number;
}) {
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
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(origin + delta * eased);
      if (t < 1) frame.current = requestAnimationFrame(tick);
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
