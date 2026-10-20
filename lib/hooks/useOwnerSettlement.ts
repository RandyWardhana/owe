import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchBill, saveClaim, savePaid } from "../bills";
import { pollWhileVisible } from "../poll";
import { fetchProofs, proofUrl } from "../proofs";
import { useStore } from "../store";
import { track } from "../analytics";
import type { Person } from "../../entities/bill";
import type { Claims, OwnerSettlement } from "../../entities/share";

// The server keys paid/proofs/claims by person index; index is position in `people`,
// which is exactly how buildSharedBill lays them out.
export function useOwnerSettlement(
  people: Person[],
  shareId: string | null,
  live: boolean,
): OwnerSettlement {
  const [paidIdx, setPaidIdx] = useState<number[]>([]);
  const [proofIdx, setProofIdx] = useState<number[]>([]);
  const [claims, setClaims] = useState<Claims>({});
  const showToast = useStore((state) => state.showToast);

  const indexOf = useCallback(
    (personId: string) => people.findIndex((person) => person.id === personId),
    [people],
  );

  useEffect(() => {
    if (!live || !shareId) return;
    let stopped = false;

    const stop = pollWhileVisible(() => {
      fetchProofs(shareId).then((list) => {
        if (!stopped && list) setProofIdx(list.map((proof) => proof.index));
      });
      fetchBill(shareId).then((row) => {
        if (stopped || !row) return;
        setPaidIdx(row.paid);
        setClaims(row.claims);
      });
    });

    return () => {
      stopped = true;
      stop();
    };
  }, [live, shareId]);

  const paidIds = useMemo(
    () => paidIdx.map((i) => people[i]?.id).filter(Boolean) as string[],
    [paidIdx, people],
  );

  const togglePaid = useCallback(
    (personId: string) => {
      if (!shareId) return;
      const personIndex = indexOf(personId);
      if (personIndex < 0) return;

      const before = paidIdx;
      const next = paidIdx.includes(personIndex)
        ? paidIdx.filter((index) => index !== personIndex)
        : [...paidIdx, personIndex];
      setPaidIdx(next);

      track("mark_paid", { by: "owner_app", paid: next.includes(personIndex) });
      savePaid(shareId, next).then((ok) => {
        if (ok) return;
        setPaidIdx(before);
        showToast("shared.settleRefused");
      });
    },
    [indexOf, paidIdx, shareId, showToast],
  );

  const claimedBy = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const [itemId, indexes] of Object.entries(claims)) {
      const ids = indexes.map((i) => people[i]?.id).filter(Boolean) as string[];
      if (ids.length) out[itemId] = ids;
    }
    return out;
  }, [claims, people]);

  const releaseClaim = useCallback(
    (itemId: string) => {
      if (!shareId) return;
      const before = claims;
      const next = { ...claims };
      delete next[itemId];
      setClaims(next);

      saveClaim(shareId, itemId, null).then((result) => {
        if (result.ok) return;
        setClaims(result.claims ?? before);
        showToast("shared.claimRefused");
      });
    },
    [claims, shareId, showToast],
  );

  const hasProofFor = useCallback(
    (personId: string) => proofIdx.includes(indexOf(personId)),
    [indexOf, proofIdx],
  );

  const proofFor = useCallback(
    (personId: string) => {
      const personIndex = indexOf(personId);
      if (personIndex < 0 || !shareId || !proofIdx.includes(personIndex)) return null;
      return proofUrl(shareId, personIndex);
    },
    [indexOf, proofIdx, shareId],
  );

  return { paidIds, togglePaid, proofFor, hasProofFor, claimedBy, releaseClaim };
}
