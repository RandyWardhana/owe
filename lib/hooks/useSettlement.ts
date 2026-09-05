import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { buzz } from "@/lib/util";
import { billId, fetchPaid, savePaid, subscribePaid } from "@/lib/bills";
import { isOwner as deviceOwnsBill, ownerToken } from "@/lib/billOwner";
import {
  fetchProofs,
  removeProof,
  uploadProof,
  type RemoveResult,
  type UploadResult,
} from "@/lib/proofs";
import { hasCloudSync } from "@/lib/cloudSync";
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
  /** Owner only. No-ops for a guest, who has no token to send. */
  confirm: (index: number) => void;
  /** Guest side: attach the receipt for this person. */
  submitProof: (index: number, file: File) => Promise<UploadResult>;
  /** Take a receipt down. Refused once the line is confirmed, unless owner. */
  dropProof: (index: number) => Promise<RemoveResult>;
}

export function useSettlement(bill: SharedBill): Settlement {
  const id = useMemo(() => billId(bill), [bill]);
  const [paid, setPaid] = useState<Set<number>>(() => readLocal(id, bill));
  const [proofs, setProofs] = useState<Set<number>>(() => readProofs(id));
  const [uploading, setUploading] = useState<number | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const paidRef = useRef(paid);
  paidRef.current = paid;

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
      fetchPaid(id).then((server) => {
        if (!cancelled && server) apply(new Set(server));
      });
    }

    const unsubscribe = subscribePaid(id, (server) => {
      if (!cancelled) apply(new Set(server));
    });
    const poll = setInterval(refreshProofs, 5000);

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
      const next = new Set(paidRef.current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      apply(next);
      savePaid(id, [...next]);
    },
    [apply, id, isOwner],
  );

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

  return { paid, proofs, isOwner, uploading, confirm, submitProof, dropProof };
}
