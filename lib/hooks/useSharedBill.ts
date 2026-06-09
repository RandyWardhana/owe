import { useEffect, useState } from "react";

import { decryptShare } from "@/lib/share";
import { fetchBill } from "@/lib/bills";
import type { SharePayload } from "@/lib/types";

type SharedState = SharePayload | null | undefined;

/* Resolves the shared bill from the URL. Two link shapes are supported:
   - short:  /s/owe-xxxxxx   → fetch the encrypted bill from Supabase by id
   - long:   /s?s=<payload>  → the bill is self-contained in the link */
export function useSharedBill() {
  const [shared, setShared] = useState<SharedState>(undefined);

  useEffect(() => {
    let cancelled = false;
    const { pathname, search, hash } = window.location;

    const shortMatch = pathname.match(/^\/s\/(owe-[a-z0-9]+)$/i);
    const params = new URLSearchParams(search);
    const raw =
      params.get("s") || (hash.startsWith("#s=") ? hash.slice(3) : "");

    const resolve = (token: string | null) => {
      if (!token) {
        if (!cancelled) setShared(null);
        return;
      }
      decryptShare(token).then((payload) => {
        if (!cancelled) setShared(payload);
      });
    };

    if (shortMatch) {
      fetchBill(shortMatch[1]).then((row) => {
        if (cancelled) return;
        resolve(row?.data ?? null);
      });
    } else {
      resolve(raw);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const clear = () => {
    window.history.replaceState(null, "", "/");
    setShared(null);
  };

  return { shared, clear };
}
