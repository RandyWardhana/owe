import { useEffect, useState } from "react";

import { useStore } from "@/lib/store";
import { pullHistory, pushHistory } from "@/lib/userBills";

export function useBillBackup() {
  const history = useStore((s) => s.history);
  const tombstones = useStore((s) => s.tombstones);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const remote = await pullHistory();
      if (cancelled) return;
      if (remote) useStore.getState().mergeHistory(remote.history, remote.tombstones);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      pushHistory(history, tombstones);
    }, 800);
    return () => clearTimeout(timer);
  }, [history, tombstones, ready]);
}
