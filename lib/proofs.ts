import type { ProofMeta, RemoveResult, UploadResult } from "../entities/proof";
import { hasCloudSync } from "./cloudSync";

// Anyone with the share link may upload a proof of their own payment, and anyone with the link
// may view it: settling up is a group matter. The random object key keeps the file unguessable.

export const MAX_PROOF_BYTES = 5 * 1024 * 1024;

export const PROOF_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const isOnline = () => typeof navigator === "undefined" || navigator.onLine;

export async function uploadProof(
  billId: string,
  index: number,
  file: File,
  name = "",
): Promise<UploadResult> {
  if (!hasCloudSync || !isOnline()) return { ok: false, reason: "offline" };
  if (!PROOF_TYPES.includes(file.type)) return { ok: false, reason: "type" };
  if (file.size > MAX_PROOF_BYTES) return { ok: false, reason: "size" };

  try {
    const res = await fetch(
      `/api/proof?id=${encodeURIComponent(billId)}&i=${index}&name=${encodeURIComponent(name)}`,
      { method: "POST", headers: { "content-type": file.type }, body: file },
    );
    if (!res.ok) return { ok: false, reason: "failed" };
    const body = (await res.json()) as { ok?: boolean };
    return body.ok ? { ok: true } : { ok: false, reason: "failed" };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

/**
 * Returns null when the server could not be asked, which is not the same as an empty list:
 * callers must keep their known set rather than overwrite it with nothing.
 */
export async function fetchProofs(billId: string): Promise<ProofMeta[] | null> {
  if (!hasCloudSync || !isOnline()) return null;
  try {
    const res = await fetch(`/api/proofs?id=${encodeURIComponent(billId)}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { proofs?: ProofMeta[] };
    return Array.isArray(body.proofs) ? body.proofs : [];
  } catch {
    return null;
  }
}

/** The server refuses once the line is marked paid, unless the owner token comes with it. */
export async function removeProof(
  billId: string,
  index: number,
  token = "",
): Promise<RemoveResult> {
  if (!hasCloudSync || !isOnline()) return { ok: false, reason: "failed" };
  try {
    const res = await fetch(
      `/api/proof?id=${encodeURIComponent(billId)}&i=${index}&t=${encodeURIComponent(token)}`,
      { method: "DELETE" },
    );
    if (res.ok) return { ok: true };
    return { ok: false, reason: res.status === 403 ? "confirmed" : "failed" };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

export const proofUrl = (billId: string, index: number): string =>
  `/api/proof?id=${encodeURIComponent(billId)}&i=${index}`;
