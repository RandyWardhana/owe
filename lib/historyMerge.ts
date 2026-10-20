import type { Draft } from "../entities/bill";
import type { Tombstones } from "../entities/sync";

export const HISTORY_LIMIT = 200;

export const changedAt = (draft: Draft): number =>
  draft.updatedAt || draft.createdAt || 0;

export function mergeHistories(
  local: Draft[],
  incoming: Draft[],
  localTombstones: Tombstones = {},
  incomingTombstones: Tombstones = {},
  limit = HISTORY_LIMIT,
): { history: Draft[]; tombstones: Tombstones } {
  const tombstones: Tombstones = { ...incomingTombstones };
  for (const [id, when] of Object.entries(localTombstones)) {
    tombstones[id] = Math.max(when, tombstones[id] ?? 0);
  }

  const byId = new Map<string, Draft>();
  for (const draft of incoming) byId.set(draft.id, draft);
  for (const draft of local) {
    const existing = byId.get(draft.id);
    if (!existing || changedAt(draft) >= changedAt(existing)) byId.set(draft.id, draft);
  }

  const history = Array.from(byId.values())
    .filter((draft) => !(tombstones[draft.id] && tombstones[draft.id] >= changedAt(draft)))
    .sort((a, b) => changedAt(b) - changedAt(a))
    .slice(0, limit);

  return { history, tombstones };
}
