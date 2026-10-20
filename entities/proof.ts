export interface ProofMeta {
  index: number;
  uploadedAt: string;
}

export type UploadResult =
  | { ok: true }
  | { ok: false; reason: "offline" | "type" | "size" | "failed" };

export type RemoveResult = { ok: true } | { ok: false; reason: "confirmed" | "failed" };
