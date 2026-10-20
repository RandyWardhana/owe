import { hasCloudSync } from "./cloudSync";
import { claimBill, forgetBill, ownerToken } from "./billOwner";
import { syncKey } from "./device";
import type { BillMissing, Claims, StoredBill } from "../entities/share";

// Proxied through /api/bill so the browser never talks to the database directly.
// Every call no-ops when cloud sync isn't configured or the device is offline.

function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

export async function saveBill(id: string, data: string): Promise<boolean> {
  if (!hasCloudSync || !isOnline()) return false;
  try {
    // The first claim to land wins, so re-sharing is harmless and a stranger cannot take it over.
    const { ownerHash } = await import("./billOwner");
    const token = claimBill(id);
    const owner_hash = await ownerHash(token);
    const sync_key = (await syncKey()) || undefined;
    const response = await fetch("/api/bill", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, data, owner_hash, owner_token: token, sync_key }),
    });
    if (!response.ok) return false;
    const body = (await response.json()) as { ok?: boolean };
    return Boolean(body.ok);
  } catch {
    return false;
  }
}

export async function loadBill(
  id: string,
): Promise<{ ok: true; row: StoredBill } | { ok: false; reason: BillMissing }> {
  if (!hasCloudSync) return { ok: false, reason: "no-cloud" };
  if (!isOnline()) return { ok: false, reason: "offline" };
  try {
    const response = await fetch(`/api/bill?id=${encodeURIComponent(id)}`);
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
      data?: string | null;
      paid?: number[];
      claims?: Claims;
    };
    if (!response.ok) {
      const reason =
        body.error === "no-db" || body.error === "db-unreachable" ? body.error : "server";
      return { ok: false, reason };
    }
    return {
      ok: true,
      row: {
        data: body.data ?? null,
        paid: Array.isArray(body.paid) ? body.paid : [],
        claims: body.claims && typeof body.claims === "object" ? body.claims : {},
      },
    };
  } catch {
    return { ok: false, reason: isOnline() ? "server" : "offline" };
  }
}

export async function fetchBill(id: string): Promise<StoredBill | null> {
  const result = await loadBill(id);
  return result.ok ? result.row : null;
}

/**
 * No owner token: the claimer is a guest. One person per call so concurrent claims cannot
 * overwrite each other; returns the server's claims so a refused write is not shown as applied.
 */
export async function saveClaim(
  id: string,
  item: string,
  person: number | null,
  on = true,
): Promise<{ ok: boolean; claims: Claims | null }> {
  if (!hasCloudSync || !isOnline()) return { ok: false, claims: null };
  try {
    const res = await fetch("/api/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, item, person, on }),
    });
    const body = (await res.json()) as { ok?: boolean; claims?: Claims };
    return { ok: Boolean(body.ok), claims: body.claims ?? null };
  } catch {
    return { ok: false, claims: null };
  }
}

/** Returns false when the server refuses the write (e.g. this device no longer owns the bill). */
export async function savePaid(id: string, paid: number[]): Promise<boolean> {
  if (!hasCloudSync || !isOnline()) return false;
  try {
    const token = ownerToken(id);
    const sync_key = token ? (await syncKey()) || undefined : undefined;
    const res = await fetch("/api/bill", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, paid, owner_token: token ?? undefined, sync_key }),
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { ok?: boolean };
    return Boolean(body.ok);
  } catch {
    return false;
  }
}

/**
 * Erases the row, its receipts and their R2 objects. Only the owning device can. Succeeds when
 * the bill was never shared, so the caller can always follow it with a local delete.
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
