import { useEffect, useMemo, useRef, useState } from "react";

import { buzz } from "@/lib/util";
import { billId, fetchPaid, savePaid, subscribePaid } from "@/lib/bills";
import { hasCloudSync } from "@/lib/cloudSync";
import type { SharedBill } from "@/lib/types";

const localKey = (id: string) => "owe.shared." + id;

function readLocal(id: string, bill: SharedBill): Set<number> {
  try {
    const raw = localStorage.getItem(localKey(id));
    return new Set(raw ? JSON.parse(raw) : bill.paidIndices || []);
  } catch {
    return new Set(bill.paidIndices || []);
  }
}

function writeLocal(id: string, paid: Set<number>) {
  try {
    localStorage.setItem(localKey(id), JSON.stringify([...paid]));
  } catch {
  }
}

const online = () => typeof navigator === "undefined" || navigator.onLine;

export function useViewerPaid(
  bill: SharedBill,
): [Set<number>, (index: number) => void] {
  const id = useMemo(() => billId(bill), [bill]);
  const [paid, setPaid] = useState<Set<number>>(() => readLocal(id, bill));
  const paidRef = useRef(paid);
  paidRef.current = paid;

  const apply = (next: Set<number>) => {
    paidRef.current = next;
    setPaid(next);
    writeLocal(id, next);
  };

  useEffect(() => {
    let cancelled = false;

    apply(readLocal(id, bill));

    if (hasCloudSync && online()) {
      fetchPaid(id).then((server) => {
        if (!cancelled && server) apply(new Set(server));
      });
    }

    const unsubscribe = subscribePaid(id, (server) => {
      if (!cancelled) apply(new Set(server));
    });

    const onReconnect = () => savePaid(id, [...paidRef.current]);
    window.addEventListener("online", onReconnect);

    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener("online", onReconnect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, bill.paidIndices]);

  const toggle = (index: number) => {
    buzz(10);
    const next = new Set(paidRef.current);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    apply(next);
    if (hasCloudSync && online()) savePaid(id, [...next]);
  };

  return [paid, toggle];
}
