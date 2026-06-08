import { useEffect, useMemo, useState } from "react";

import { buzz } from "@/lib/util";
import type { SharePayload } from "@/lib/types";

function billKey(p: SharePayload): string {
  const sig = JSON.stringify([p.t, p.c, p.g, p.pp.map((x) => [x.n, x.t])]);
  let h = 0;
  for (let i = 0; i < sig.length; i++) h = (h * 31 + sig.charCodeAt(i)) | 0;
  return "owe.shared." + (h >>> 0).toString(36);
}

export function useViewerPaid(
  payload: SharePayload,
): [Set<number>, (index: number) => void] {
  const key = useMemo(() => billKey(payload), [payload]);
  const [paid, setPaid] = useState<Set<number>>(() => new Set(payload.pd || []));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      setPaid(new Set(raw ? JSON.parse(raw) : payload.pd || []));
    } catch {
      setPaid(new Set(payload.pd || []));
    }
  }, [key, payload.pd]);

  const toggle = (index: number) => {
    buzz(10);
    setPaid((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      try {
        localStorage.setItem(key, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };

  return [paid, toggle];
}
