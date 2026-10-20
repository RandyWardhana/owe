import type { OwnerTokens } from "../entities/sync";

// A share link carries no identity, so the creating device keeps a random token per bill and
// the server only ever sees its sha256. There are no accounts: losing the device loses ownership.

const KEY = "owe.owner.v1";

function read(): OwnerTokens {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as OwnerTokens) : {};
  } catch {
    return {};
  }
}

function write(tokens: OwnerTokens): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(tokens));
  } catch {
    // storage blocked; the bill still shares, it just cannot be marked later
  }
}

export function ownerToken(billId: string): string | null {
  return read()[billId] ?? null;
}

export function isOwner(billId: string): boolean {
  return Boolean(ownerToken(billId));
}

export function claimBill(billId: string): string {
  const tokens = read();
  if (!tokens[billId]) {
    tokens[billId] =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    write(tokens);
  }
  return tokens[billId];
}

export function allTokens(): Record<string, string> {
  return read();
}

/** Never overwrites a held token: the first claim owns the bill, so a stale one would lock this device out. */
export function adoptTokens(tokens: Record<string, string>): void {
  const held = read();
  let changed = false;
  Object.entries(tokens || {}).forEach(([billId, token]) => {
    if (billId && token && !held[billId]) {
      held[billId] = token;
      changed = true;
    }
  });
  if (changed) write(held);
}

export function forgetBill(billId: string): void {
  const tokens = read();
  if (!(billId in tokens)) return;
  delete tokens[billId];
  write(tokens);
}

export async function ownerHash(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
