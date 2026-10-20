import type { Account } from "./payment";

export interface Contact {
  name: string;
  accounts: { key: Account["key"]; value: string }[];
  usedAt: number;
}
