import { hasCloudSync } from "./cloudSync";
import { claimBill, forgetBill, ownerToken } from "./billOwner";
import type { SharedBill } from "./types";

/* Cloud layer for shared bills, proxied through our own server (/api/bill) so
   the browser never talks to the database directly. Stores `{ id, data, paid }`:
   - id   — deterministic, derived from the bill (same for everyone)
   - data — the encrypted share string, so a short link can point to the bill
   - paid — which person indices have settled
   Every call no-ops gracefully when cloud isn't configured / offline. */

function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

/** Deterministic bill id — same for everyone who opens the same bill. */
export function billId(bill: SharedBill): string {
  const signature = JSON.stringify([
    bill.title,
    bill.currency,
    bill.grandTotal,
    bill.people.map((person) => [person.name, person.total]),
  ]);
  let hash = 0;
  for (let i = 0; i < signature.length; i++) {
    hash = (hash * 31 + signature.charCodeAt(i)) | 0;
  }
  return "owe-" + (hash >>> 0).toString(36).padStart(6, "0");
}

/** Stores the encrypted bill so a short link can resolve it. Returns success. */
export async function saveBill(id: string, data: string): Promise<boolean> {
  if (!hasCloudSync || !isOnline()) return false;
  try {
    // Sharing a bill claims it for this device. Only the claim that lands first
    // counts, so re-sharing is harmless and a stranger cannot take it over.
    const { ownerHash } = await import("./billOwner");
    const owner_hash = await ownerHash(claimBill(id));
    const response = await fetch("/api/bill", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, data, owner_hash }),
    });
    if (!response.ok) return false;
    const body = (await response.json()) as { ok?: boolean };
    return Boolean(body.ok);
  } catch {
    return false;
  }
}

/** Loads a stored bill (encrypted data + paid state) by id. */
export async function fetchBill(
  id: string,
): Promise<{ data: string | null; paid: number[] } | null> {
  if (!hasCloudSync || !isOnline()) return null;
  try {
    const response = await fetch(`/api/bill?id=${encodeURIComponent(id)}`);
    if (!response.ok) return null;
    const body = (await response.json()) as {
      data?: string | null;
      paid?: number[];
    };
    return {
      data: body.data ?? null,
      paid: Array.isArray(body.paid) ? body.paid : [],
    };
  } catch {
    return null;
  }
}

/** Returns the server's paid indices, or null if unavailable / not found. */
export async function fetchPaid(id: string): Promise<number[] | null> {
  const row = await fetchBill(id);
  return row ? row.paid : null;
}

/**
 * Upserts the paid indices for a bill.
 *
 * Reports whether the server took it. It used to swallow everything, so a write
 * the server REFUSED -- a bill this device no longer owns -- still looked like
 * it worked: the tick moved, and the next reload put it back. A settle screen
 * that quietly disagrees with the server is worse than one that says no.
 */
export async function savePaid(id: string, paid: number[]): Promise<boolean> {
  if (!hasCloudSync || !isOnline()) return false;
  try {
    const res = await fetch("/api/bill", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, paid, owner_token: ownerToken(id) ?? undefined }),
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { ok?: boolean };
    return Boolean(body.ok);
  } catch {
    return false;
  }
}

/** Polls for paid changes on a bill (every 5s). Returns an unsubscribe fn. */
export function subscribePaid(
  id: string,
  onChange: (paid: number[]) => void,
): () => void {
  if (!hasCloudSync) return () => {};
  let stopped = false;
  let last = "";

  const tick = async () => {
    if (stopped || !isOnline()) return;
    const paid = await fetchPaid(id);
    if (stopped || !paid) return;
    const key = JSON.stringify(paid);
    if (key !== last) {
      last = key;
      onChange(paid);
    }
  };

  const interval = setInterval(tick, 5000);
  tick();

  return () => {
    stopped = true;
    clearInterval(interval);
  };
}

/**
 * Erase a shared bill from the server: its row, its receipts, and the R2 objects
 * behind them. Only the device that created it can; everyone else holds a link,
 * not a claim. Succeeds quietly when the bill was never shared, so the caller
 * can always follow it with a local delete.
 */
export async function deleteBill(id: string): Promise<boolean> {
  const token = ownerToken(id);
  if (!hasCloudSync || !isOnline() || !token) {
    forgetBill(id);
    return !token;
  }
  try {
    const res = await fetch(
      `/api/bill?id=${encodeURIComponent(id)}&t=${encodeURIComponent(token)}`,
      { method: "DELETE" },
    );
    const body = (await res.json()) as { ok?: boolean };
    if (body.ok) forgetBill(id);
    return Boolean(body.ok);
  } catch {
    return false;
  }
}
