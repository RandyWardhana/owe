import { useCallback, useEffect, useMemo, useState } from "react";

import {
  fetchBill,
  saveClaim,
  savePaid,
  subscribePaid,
  type Claims,
} from "@/lib/bills";
import { fetchProofs, proofUrl } from "@/lib/proofs";
import { useStore } from "@/lib/store";
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
  /** itemId -> ids of the people who claimed it, from the shared link. */
  claimedBy: Record<string, string[]>;
  /** Take someone's name back off an item they claimed by mistake. */
  releaseClaim: (itemId: string) => void;
}

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
    (personId: string) => people.findIndex((p) => p.id === personId),
    [people],
  );

  useEffect(() => {
    if (!live || !shareId) return;
    let stopped = false;

    fetchBill(shareId).then((row) => {
      if (stopped || !row) return;
      setPaidIdx(row.paid);
      setClaims(row.claims);
    });
    fetchProofs(shareId).then((list) => {
      if (!stopped && list) setProofIdx(list.map((p) => p.index));
    });

    const unsubscribe = subscribePaid(shareId, (server) => {
      if (!stopped) setPaidIdx(server);
    });
    /* Claims land from other people's phones while the maker is looking at
       this screen -- the one place they actually watch the bill from. */
    const poll = setInterval(() => {
      fetchProofs(shareId).then((list) => {
        if (!stopped && list) setProofIdx(list.map((p) => p.index));
      });
      fetchBill(shareId).then((row) => {
        if (!stopped && row) setClaims(row.claims);
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

      const before = paidIdx;
      const next = paidIdx.includes(i)
        ? paidIdx.filter((x) => x !== i)
        : [...paidIdx, i];
      setPaidIdx(next);

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
      const i = indexOf(personId);
      if (i < 0 || !shareId || !proofIdx.includes(i)) return null;
      return proofUrl(shareId, i);
    },
    [indexOf, proofIdx, shareId],
  );

  return { paidIds, togglePaid, proofFor, hasProofFor, claimedBy, releaseClaim };
}
