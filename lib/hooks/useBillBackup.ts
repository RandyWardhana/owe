import { useEffect, useState } from "react";

import { useStore } from "@/lib/store";
import {
  pullHistory,
  pushHistory,
  decryptBackup,
  setSyncCookie,
} from "@/lib/userBills";
import type { Draft } from "@/lib/types";

export function useBillBackup(initialBackup?: string | null) {
  const history = useStore((s) => s.history);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // refresh the cookie so the next load can fetch the backup server-side
      setSyncCookie();
      // prefer the SSR-injected blob (no network); fall back to a fetch
      let remote: Draft[] | null = initialBackup
        ? await decryptBackup(initialBackup)
        : null;
      if (remote === null) remote = await pullHistory();
      if (cancelled) return;
      if (remote && remote.length) useStore.getState().mergeHistory(remote);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      pushHistory(history);
    }, 800);
    return () => clearTimeout(timer);
  }, [history, ready]);
}
