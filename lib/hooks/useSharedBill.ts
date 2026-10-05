import { useEffect, useState } from "react";

import { decryptShare } from "@/lib/share";
import { loadBill, type BillMissing } from "@/lib/bills";
import type { SharedBill } from "@/lib/types";

type SharedState = SharedBill | null | undefined;

/* Resolves the shared bill from the URL. Two link shapes are supported:
   - short:  /s/owe-xxxxxx   → fetch the encrypted bill from the cloud by id
   - long:   /s?s=<payload>  → the bill is self-contained in the link */
export function useSharedBill() {
  const [shared, setShared] = useState<SharedState>(undefined);
  const [shareId, setShareId] = useState<string | null>(null);
  /* Set when the URL is a shared link that could not be opened, so the app can
     say why instead of quietly showing home as if no link had been followed. */
  const [missing, setMissing] = useState<BillMissing | null>(null);

  useEffect(() => {
    let cancelled = false;
    const { pathname, search, hash } = window.location;

    const shortMatch = pathname.match(/^\/s\/(owe-[a-z0-9]+)$/i);
    const params = new URLSearchParams(search);
    const raw =
      params.get("s") || (hash.startsWith("#s=") ? hash.slice(3) : "");

    const fail = (reason: BillMissing) => {
      if (cancelled) return;
      console.warn(`[owe] shared link could not be opened: ${reason}`);
      setMissing(reason);
      setShared(null);
    };

    const resolve = (token: string) => {
      decryptShare(token).then((payload) => {
        if (cancelled) return;
        if (payload) setShared(payload);
        else fail("unreadable");
      });
    };

    if (shortMatch) {
      setShareId(shortMatch[1]);
      loadBill(shortMatch[1]).then((result) => {
        if (cancelled) return;
        if (!result.ok) fail(result.reason);
        else if (!result.row.data) fail("not-found");
        else resolve(result.row.data);
      });
    } else if (raw) {
      resolve(raw);
    } else {
      setShared(null);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const clear = () => {
    window.history.replaceState(null, "", "/");
    setMissing(null);
    setShared(null);
  };

  return { shared, shareId, missing, clear };
}
