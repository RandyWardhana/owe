import { useCallback, useEffect, useRef, useState } from "react";

import { useStore } from "@/lib/store";
import { buzz } from "@/lib/util";

export type CopyPhase = "idle" | "copied" | "leaving";

export function useCopyAnim() {
  const showToast = useStore((s) => s.showToast);
  const [phase, setPhase] = useState<CopyPhase>("idle");
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exit = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (hold.current) clearTimeout(hold.current);
      if (exit.current) clearTimeout(exit.current);
    },
    [],
  );

  const copy = useCallback(
    async (text: string) => {
      await navigator.clipboard.writeText(text).catch(() => {});
      buzz(12);
      showToast("common.copied");
      if (hold.current) clearTimeout(hold.current);
      if (exit.current) clearTimeout(exit.current);
      setPhase("copied");
      hold.current = setTimeout(() => {
        setPhase("leaving");
        exit.current = setTimeout(() => setPhase("idle"), 340);
      }, 2200);
    },
    [showToast],
  );

  return { phase, copy };
}
