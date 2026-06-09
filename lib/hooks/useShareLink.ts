import { useEffect, useMemo, useState } from "react";

import { encryptShare } from "@/lib/share";
import { billId, saveBill } from "@/lib/bills";
import { hasSupabase } from "@/lib/supabase";
import type { SharePayload } from "@/lib/types";

const online = () => typeof navigator === "undefined" || navigator.onLine;

/* Builds the share link. When online + Supabase is configured, the encrypted
   bill is stored under its id and a short `/s/owe-…` link is returned. Otherwise
   it falls back to the self-contained long `/s?s=…` link. */
export function useShareLink(payload: SharePayload) {
  const [link, setLink] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const enc = await encryptShare(payload);
      if (cancelled) return;
      const origin = window.location.origin;
      const longLink = `${origin}/s?s=${enc}`;

      if (hasSupabase && online()) {
        const id = billId(payload);
        const ok = await saveBill(id, enc);
        if (cancelled) return;
        if (ok) {
          setLink(`${origin}/s/${id}`);
          return;
        }
      }
      setLink(longLink);
    })();

    return () => {
      cancelled = true;
    };
  }, [payload]);

  const label = useMemo(() => {
    try {
      const u = new URL(link);
      // short link → show it in full; long link → elide the payload
      return u.search ? `${u.host}${u.pathname}?s=…` : `${u.host}${u.pathname}`;
    } catch {
      return "";
    }
  }, [link]);

  return { link, label };
}
