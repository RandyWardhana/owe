import type { Draft } from "./bill";
import type { Contact } from "./contact";

export type Tombstones = Record<string, number>;

export type OwnerTokens = Record<string, string>;

export interface SyncPayload {
  history: Draft[];
  // Without these a delete is undone by the next sync.
  tombstones?: Record<string, number>;
  contacts?: Contact[];
  // billId -> owner token, so another of your devices can confirm payments on bills you created.
  owners?: Record<string, string>;
  name?: string;
}
