import { hasCloudSync } from "./cloudSync";

/* Payment proof: the screenshot someone sends to show they transferred.
   Uploading is open to anyone holding the share link — they are proving their
   own payment. Viewing the image is not: only the bill's creator can, so the
   rest of the table cannot read a stranger's banking app. */

export const MAX_PROOF_BYTES = 5 * 1024 * 1024;

export const PROOF_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const isOnline = () => typeof navigator === "undefined" || navigator.onLine;

export interface ProofMeta {
  index: number;
  uploadedAt: string;
}

export type UploadResult =
  | { ok: true }
  | { ok: false; reason: "offline" | "type" | "size" | "failed" };

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
 * Who has uploaded, and when. Open to everyone — the image itself is not.
 *
 * Returns null when the question could not be asked: offline, a dead server, a
 * non-OK reply. That is NOT the same answer as an empty list, and conflating
 * the two is what made a receipt vanish on refresh whenever the server was
 * down — the caller would happily overwrite a known-good set with nothing.
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

export type RemoveResult = { ok: true } | { ok: false; reason: "confirmed" | "failed" };

/** Takes a proof down. The server refuses once the line is marked paid, unless
    the owner token comes with it. */
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

/** URL the creator can open to see one proof. Requires the owner token. */
export const proofUrl = (billId: string, index: number, token: string): string =>
  `/api/proof?id=${encodeURIComponent(billId)}&i=${index}&t=${encodeURIComponent(token)}`;
