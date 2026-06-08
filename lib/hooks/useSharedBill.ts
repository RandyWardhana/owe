import { useEffect, useState } from "react";

import { decryptShare } from "@/lib/share";
import type { SharePayload } from "@/lib/types";

type SharedState = SharePayload | null | undefined;

export function useSharedBill() {
  const [shared, setShared] = useState<SharedState>(undefined);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const raw =
      params.get("s") ||
      (window.location.hash.startsWith("#s=")
        ? window.location.hash.slice(3)
        : "");

    if (!raw) {
      setShared(null);
      return;
    }
    decryptShare(raw).then((payload) => {
      if (!cancelled) setShared(payload);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const clear = () => {
    window.history.replaceState(null, "", window.location.pathname);
    setShared(null);
  };

  return { shared, clear };
}
