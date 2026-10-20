import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { buzz } from "../util";
import { fetchBill, saveClaim, savePaid } from "../bills";
import { legacyShareId } from "../shareId";
import { pollWhileVisible } from "../poll";
import { isOwner as deviceOwnsBill, ownerToken } from "../billOwner";
import { fetchProofs, removeProof, uploadProof } from "../proofs";
import { hasCloudSync } from "../cloudSync";
import { useStore } from "../store";
import { track } from "../analytics";
import type { RemoveResult, UploadResult } from "../../entities/proof";
import type { Claims, SettlementState, SharedBill } from "../../entities/share";

// A guest can only upload a receipt. Only the device holding the owner token can mark a line
// paid, otherwise anyone with the link could tick themselves off. Paid and proofs mirror to
// localStorage so the screen survives a reload and a dead connection.

const localKey = (id: string) => "owe.shared." + id;
const proofKey = (id: string) => "owe.proofs." + id;

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
    // private mode; the server copy is still authoritative
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
    // private mode; the server copy is still authoritative
  }
}

export function useSettlement(bill: SharedBill, shareId?: string): SettlementState {
  const id = useMemo(() => shareId || legacyShareId(bill), [bill, shareId]);
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
      const next = new Set(list.map((proof) => proof.index));
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

    const stop = pollWhileVisible(() => {
      refreshProofs();
      if (!hasCloudSync) return;
      fetchBill(id).then((row) => {
        if (cancelled || !row) return;
        apply(new Set(row.paid));
        setClaims(row.claims);
      });
    });

    return () => {
      cancelled = true;
      stop();
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

      track("mark_paid", { by: "owner_link", paid: next.has(index) });
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
      // The server refuses once the holder has been confirmed as paid.
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
      // Same rule as the assign step: an even split, fees included.
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
