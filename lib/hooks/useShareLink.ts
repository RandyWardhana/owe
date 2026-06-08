import { useEffect, useMemo, useState } from "react";

import { encryptShare } from "@/lib/share";
import type { SharePayload } from "@/lib/types";

export function useShareLink(payload: SharePayload) {
  const [link, setLink] = useState("");

  useEffect(() => {
    let cancelled = false;
    encryptShare(payload).then((enc) => {
      if (!cancelled) {
        setLink(`${window.location.origin}${window.location.pathname}?s=${enc}`);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [payload]);

  const label = useMemo(() => {
    try {
      const u = new URL(link);
      return `${u.host}${u.pathname}?s=…`;
    } catch {
      return "";
    }
  }, [link]);

  return { link, label };
}
