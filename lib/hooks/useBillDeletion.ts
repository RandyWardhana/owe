import { useState } from "react";

import { deleteBill } from "../bills";
import { useStore } from "../store";
import { buzz } from "../util";
import type { Draft } from "../../entities/bill";
import type { BillDeletion } from "../../entities/props/desk";

export function useBillDeletion(): BillDeletion {
  const deleteBillLocally = useStore((s) => s.deleteBillLocally);
  const showToast = useStore((s) => s.showToast);
  const [confirming, setConfirming] = useState<Draft | null>(null);

  const confirm = async () => {
    const entry = confirming;
    if (!entry) return;
    setConfirming(null);
    buzz(10);
    // Server first: if that fails the row stays, since the share link still reaches the bill.
    const gone = await deleteBill(entry.id);
    if (!gone) {
      showToast("home.deleteFailed");
      return;
    }
    deleteBillLocally(entry.id);
    showToast("home.deleted");
  };

  return { confirming, ask: setConfirming, cancel: () => setConfirming(null), confirm };
}
