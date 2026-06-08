import { useEffect, useRef, useState } from "react";

import { useStore } from "@/lib/store";

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/* Animates a number towards `value`. On mount it counts up from 0; on later
   changes it eases from whatever is currently shown to the new value. Honours
   the global `anim` setting and prefers-reduced-motion — both short-circuit to
   the final value with no animation. */
export function useCountUp(value: number, duration = 650): number {
  const anim = useStore((s) => s.anim);
  const [display, setDisplay] = useState(() => (anim ? 0 : value));
  const shownRef = useRef(display);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const set = (v: number) => {
      shownRef.current = v;
      setDisplay(v);
    };

    if (!anim || reduce || !isFinite(value)) {
      set(value);
      return;
    }

    const from = shownRef.current;
    const to = value;
    if (from === to) return;

    let start: number | null = null;
    const tick = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      set(from + (to - from) * easeOutCubic(p));
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        set(to);
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, anim, duration]);

  return display;
}
