import { useEffect, useState } from "react";

import { decryptShare } from "../share";
import { loadBill } from "../bills";
import type { BillMissing, SharedState } from "../../entities/share";
import { track } from "../analytics";

// Short links (/s/owe-xxxxxx) fetch the bill by id; long links (/s?s=<payload>) carry it inline.
export function useSharedBill() {
  const [shared, setShared] = useState<SharedState>(undefined);
  const [shareId, setShareId] = useState<string | null>(null);
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
      track("shared_bill_failed", { reason });
      console.warn(`[owe] shared link could not be opened: ${reason}`);
      setMissing(reason);
      setShared(null);
    };

    const resolve = (token: string) => {
      decryptShare(token).then((payload) => {
        if (cancelled) return;
        if (payload) {
          track("shared_bill_opened", { kind: shortMatch ? "short" : "long" });
          setShared(payload);
        } else fail("unreadable");
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
