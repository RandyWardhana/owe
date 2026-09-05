import { useEffect, useMemo, useState } from "react";

import { encryptShare } from "@/lib/share";
import { billId, saveBill } from "@/lib/bills";
import { hasCloudSync } from "@/lib/cloudSync";
import type { SharedBill } from "@/lib/types";

const online = () => typeof navigator === "undefined" || navigator.onLine;

/* Builds the share link. When online + cloud sync is configured, the encrypted
   bill is stored under its id and a short `/s/owe-…` link is returned. Otherwise
   it falls back to the self-contained long `/s?s=…` link. */
export function useShareLink(bill: SharedBill, shareId?: string) {
  const [link, setLink] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const enc = await encryptShare(bill);
      if (cancelled) return;
      const origin = window.location.origin;
      const longLink = `${origin}/s?s=${enc}`;

      if (hasCloudSync && online()) {
        const id = shareId || billId(bill);
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
  }, [bill, shareId]);

  const label = useMemo(() => {
    try {
      const url = new URL(link);
      // short link → show it in full; long link → elide the payload
      return url.search ? `${url.host}${url.pathname}?s=…` : `${url.host}${url.pathname}`;
    } catch {
      return "";
    }
  }, [link]);

  return { link, label };
}
