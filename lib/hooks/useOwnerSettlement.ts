import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchPaid, savePaid, subscribePaid } from "@/lib/bills";
import { ownerToken } from "@/lib/billOwner";
import { fetchProofs, proofUrl } from "@/lib/proofs";
import type { Person } from "@/lib/types";

/**
 * The creator's side of settling up, on their own breakdown screen.
 *
 * The app and the share link had two unrelated ideas of "paid": the breakdown
 * kept a local list of person IDs on the draft, while the link kept a list of
 * INDEXES on the server. Ticking someone off in the app reached nobody, and a
 * receipt uploaded through the link never appeared in the app. On a phone —
 * where owe is installed as a PWA and the breakdown is the screen you actually
 * open — that meant the bill you created was the one place you could not see
 * what was happening.
 *
 * This bridges the two. Index is position in `people`, which is exactly how
 * buildSharedBill lays them out, so the mapping is not a guess.
 */
export interface OwnerSettlement {
  paidIds: string[];
  togglePaid: (personId: string) => void;
  proofFor: (personId: string) => string | null;
  hasProofFor: (personId: string) => boolean;
}

export function useOwnerSettlement(
  people: Person[],
  shareId: string | null,
  live: boolean,
): OwnerSettlement {
  const [paidIdx, setPaidIdx] = useState<number[]>([]);
  const [proofIdx, setProofIdx] = useState<number[]>([]);

  const indexOf = useCallback(
    (personId: string) => people.findIndex((p) => p.id === personId),
    [people],
  );

  useEffect(() => {
    if (!live || !shareId) return;
    let stopped = false;

    fetchPaid(shareId).then((server) => {
      if (!stopped && server) setPaidIdx(server);
    });
    fetchProofs(shareId).then((list) => {
      if (!stopped && list) setProofIdx(list.map((p) => p.index));
    });

    const unsubscribe = subscribePaid(shareId, (server) => {
      if (!stopped) setPaidIdx(server);
    });
    const poll = setInterval(() => {
      fetchProofs(shareId).then((list) => {
        if (!stopped && list) setProofIdx(list.map((p) => p.index));
      });
    }, 5000);

    return () => {
      stopped = true;
      unsubscribe();
      clearInterval(poll);
    };
  }, [live, shareId]);

  const paidIds = useMemo(
    () => paidIdx.map((i) => people[i]?.id).filter(Boolean) as string[],
    [paidIdx, people],
  );

  const togglePaid = useCallback(
    (personId: string) => {
      if (!shareId) return;
      const i = indexOf(personId);
      if (i < 0) return;

      const next = paidIdx.includes(i)
        ? paidIdx.filter((x) => x !== i)
        : [...paidIdx, i];
      setPaidIdx(next);
      savePaid(shareId, next);
    },
    [indexOf, paidIdx, shareId],
  );

  const hasProofFor = useCallback(
    (personId: string) => proofIdx.includes(indexOf(personId)),
    [indexOf, proofIdx],
  );

  const proofFor = useCallback(
    (personId: string) => {
      const i = indexOf(personId);
      const token = shareId ? ownerToken(shareId) : null;
      if (i < 0 || !shareId || !token || !proofIdx.includes(i)) return null;
      return proofUrl(shareId, i, token);
    },
    [indexOf, proofIdx, shareId],
  );

  return { paidIds, togglePaid, proofFor, hasProofFor };
}
