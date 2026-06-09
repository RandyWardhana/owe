import { useEffect, useState } from "react";

import { useStore } from "@/lib/store";
import { pullHistory, pushHistory } from "@/lib/userBills";

export function useBillBackup() {
  const history = useStore((s) => s.history);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const remote = await pullHistory();
      if (cancelled) return;
      const local = useStore.getState().history;
      if (remote && remote.length && local.length === 0)
        useStore.setState({ history: remote.slice(0, 30) });
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
