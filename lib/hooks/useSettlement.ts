import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { buzz } from "@/lib/util";
import {
  billId,
  fetchBill,
  saveClaim,
  savePaid,
  subscribePaid,
  type Claims,
} from "@/lib/bills";
import { isOwner as deviceOwnsBill, ownerToken } from "@/lib/billOwner";
import {
  fetchProofs,
  removeProof,
  uploadProof,
  type RemoveResult,
  type UploadResult,
} from "@/lib/proofs";
import { hasCloudSync } from "@/lib/cloudSync";
import { useStore } from "@/lib/store";
import type { SharedBill } from "@/lib/types";

/* Settling up, from both sides of the same screen.

   A guest uploads the transfer receipt; that is all they can do. Only the
   device that created the bill can turn a line green, because only it holds the
   owner token — otherwise anyone with the link could tick themselves off.

   The paid set still mirrors to localStorage so the screen survives a reload
   and a dead connection, exactly as it did before proofs existed. */

const localKey = (id: string) => "owe.shared." + id;
const proofKey = (id: string) => "owe.proofs." + id;

/* Proofs get the same local mirror `paid` has. Without it a refresh while the
   server was unreachable showed "Paid already?" on a line that already had a
   receipt attached -- the guest would upload it a second time. */
function readProofs(id: string): Set<number> {
  try {
    const raw = localStorage.getItem(proofKey(id));
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function writeProofs(id: string, indices: Set<number>) {
  try {
    localStorage.setItem(proofKey(id), JSON.stringify([...indices]));
  } catch {
    /* private mode; the server copy is still authoritative */
  }
}

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
    /* private mode; the server copy is still authoritative */
  }
}

const online = () => typeof navigator === "undefined" || navigator.onLine;

export interface Settlement {
  paid: Set<number>;
  proofs: Set<number>;
  isOwner: boolean;
  uploading: number | null;
  /** itemId -> the people who put their names on it. */
  claims: Claims;
  /** What each person's claims add to their share, fees included. */
  claimedTotals: number[];
  /** Put someone on an unassigned item, or take them off with on:false. */
  claim: (itemId: string, person: number, on: boolean) => Promise<boolean>;
  /** Owner only. No-ops for a guest, who has no token to send. */
  confirm: (index: number) => void;
  /** Guest side: attach the receipt for this person. */
  submitProof: (index: number, file: File) => Promise<UploadResult>;
  /** Take a receipt down. Refused once the line is confirmed, unless owner. */
  dropProof: (index: number) => Promise<RemoveResult>;
}

export function useSettlement(bill: SharedBill, shareId?: string): Settlement {
  // The link that was opened is the source of truth. Re-hashing the bill
  // would miss every edit made since it was shared.
  const id = useMemo(() => shareId || billId(bill), [bill, shareId]);
  const [paid, setPaid] = useState<Set<number>>(() => readLocal(id, bill));
  const [proofs, setProofs] = useState<Set<number>>(() => readProofs(id));
  const [uploading, setUploading] = useState<number | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [claims, setClaims] = useState<Claims>({});
  const paidRef = useRef(paid);
  paidRef.current = paid;
  const showToast = useStore((state) => state.showToast);

  const apply = useCallback(
    (next: Set<number>) => {
      paidRef.current = next;
      setPaid(next);
      writeLocal(id, next);
    },
    [id],
  );

  const refreshProofs = useCallback(() => {
    fetchProofs(id).then((list) => {
      // null means the server never answered; keep what we already knew.
      if (!list) return;
      const next = new Set(list.map((p) => p.index));
      setProofs(next);
      writeProofs(id, next);
    });
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    // Ownership is a localStorage read, so it must happen after mount or the
    // server render and the first client render disagree.
    setIsOwner(deviceOwnsBill(id));
    apply(readLocal(id, bill));
    setProofs(readProofs(id));
    refreshProofs();

    if (hasCloudSync && online()) {
      fetchBill(id).then((row) => {
        if (cancelled || !row) return;
        apply(new Set(row.paid));
        setClaims(row.claims);
      });
    }

    const unsubscribe = subscribePaid(id, (server) => {
      if (!cancelled) apply(new Set(server));
    });
    /* Claims arrive from other people's phones, so the screen has to keep
       asking; there is no push channel and the maker needs to see a name land
       on an item without reloading. */
    const poll = setInterval(() => {
      refreshProofs();
      if (!hasCloudSync || !online()) return;
      fetchBill(id).then((row) => {
        if (!cancelled && row) setClaims(row.claims);
      });
    }, 5000);

    return () => {
      cancelled = true;
      unsubscribe();
      clearInterval(poll);
    };
  }, [id, bill, apply, refreshProofs]);

  const confirm = useCallback(
    (index: number) => {
      if (!isOwner || !ownerToken(id)) return;
      buzz(10);
      const before = new Set(paidRef.current);
      const next = new Set(before);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      apply(next);

      // Put it back if the server refuses, rather than showing a change that
      // the next reload will undo.
      savePaid(id, [...next]).then((ok) => {
        if (ok) return;
        apply(before);
        showToast("shared.settleRefused");
      });
    },
    [apply, id, isOwner, showToast],
  );

  const claim = useCallback(
    async (itemId: string, person: number, on: boolean): Promise<boolean> => {
      const before = claims;
      const holders = claims[itemId] ?? [];
      const updated = on
        ? [...new Set([...holders, person])].sort((a, b) => a - b)
        : holders.filter((who) => who !== person);

      const next = { ...claims };
      if (updated.length) next[itemId] = updated;
      else delete next[itemId];
      setClaims(next);
      buzz(8);

      const result = await saveClaim(id, itemId, person, on);
      if (result.ok) {
        if (result.claims) setClaims(result.claims);
        return true;
      }
      // The server refuses once the holder has been confirmed as paid; showing
      // the change anyway would promise a total nobody is going to be charged.
      setClaims(result.claims ?? before);
      showToast("shared.claimRefused");
      return false;
    },
    [claims, id, showToast],
  );

  const claimedTotals = useMemo(() => {
    const totals = bill.people.map(() => 0);
    const rate = 1 + (bill.feeRate || 0);
    for (const item of bill.claimable) {
      const holders = (claims[item.id] ?? []).filter(
        (who) => who >= 0 && who < totals.length,
      );
      if (!holders.length) continue;
      // A plate three people shared costs each of them a third of it, fees and
      // all -- the same rule the maker's own assign step uses.
      const each = (item.amount * rate) / holders.length;
      for (const who of holders) totals[who] += each;
    }
    return totals;
  }, [bill.claimable, bill.feeRate, bill.people, claims]);

  const submitProof = useCallback(
    async (index: number, file: File): Promise<UploadResult> => {
      setUploading(index);
      const result = await uploadProof(id, index, file, bill.people[index]?.name ?? "");
      setUploading(null);
      if (result.ok) {
        buzz(10);
        setProofs((prev) => {
          const next = new Set(prev).add(index);
          writeProofs(id, next);
          return next;
        });
      }
      return result;
    },
    [id, bill],
  );

  const dropProof = useCallback(
    async (index: number): Promise<RemoveResult> => {
      const result = await removeProof(id, index, ownerToken(id) ?? "");
      if (result.ok) {
        buzz(8);
        setProofs((prev) => {
          const next = new Set(prev);
          next.delete(index);
          writeProofs(id, next);
          return next;
        });
      } else {
        refreshProofs();
      }
      return result;
    },
    [id, refreshProofs],
  );

  return {
    paid,
    proofs,
    isOwner,
    uploading,
    claims,
    claimedTotals,
    claim,
    confirm,
    submitProof,
    dropProof,
  };
}
