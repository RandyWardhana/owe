import { useEffect, useState } from "react";

import { useStore } from "@/lib/store";
import { pullContacts, pushContacts } from "@/lib/contacts";
import { pullHistory, pushHistory } from "@/lib/userBills";

/** Restores the encrypted per-device backup (bill history + saved people) on
    mount, then mirrors local changes back up, debounced. No-ops without cloud. */
export function useCloudBackup() {
  const history = useStore((s) => s.history);
  const contacts = useStore((s) => s.contacts);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [remoteHistory, remoteContacts] = await Promise.all([
        pullHistory(),
        pullContacts(),
      ]);
      if (cancelled) return;
      const store = useStore.getState();
      if (remoteHistory && remoteHistory.length) store.mergeHistory(remoteHistory);
      if (remoteContacts && remoteContacts.length) store.mergeContacts(remoteContacts);
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
      pushContacts(contacts);
    }, 800);
    return () => clearTimeout(timer);
  }, [history, contacts, ready]);
}
