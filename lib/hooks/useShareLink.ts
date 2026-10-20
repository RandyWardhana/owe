import { useEffect, useMemo, useState } from "react";

import { encryptShare } from "../share";
import { saveBill } from "../bills";
import { hasCloudSync } from "../cloudSync";
import type { SharedBill } from "../../entities/share";

const online = () => typeof navigator === "undefined" || navigator.onLine;

// Short `/s/owe-…` link when the bill can be stored in the cloud, else the self-contained `/s?s=…`.
export function useShareLink(bill: SharedBill, shareId: string) {
  const [link, setLink] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const encoded = await encryptShare(bill);
      if (cancelled) return;
      const origin = window.location.origin;
      const longLink = `${origin}/s?s=${encoded}`;

      if (hasCloudSync && online()) {
        const ok = await saveBill(shareId, encoded);
        if (cancelled) return;
        if (ok) {
          setLink(`${origin}/s/${shareId}`);
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
      return url.search ? `${url.host}${url.pathname}?s=…` : `${url.host}${url.pathname}`;
    } catch {
      return "";
    }
  }, [link]);

  return { link, label };
}
