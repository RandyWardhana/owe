/* Proof that this device created a bill.
   A share link carries no identity, so "only the person who made the bill can
   mark someone paid" needs something the creator holds and nobody else does.
   The device keeps a random token per bill; the server only ever sees its
   sha256. Losing the device loses the ability to mark — there is no account to
   recover it from, which is the price of having no accounts. */

const KEY = "owe.owner.v1";

type Tokens = Record<string, string>;

function read(): Tokens {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as Tokens) : {};
  } catch {
    return {};
  }
}

function write(tokens: Tokens): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(tokens));
  } catch {
    /* storage blocked; the bill still shares, it just cannot be marked later */
  }
}

export function ownerToken(billId: string): string | null {
  return read()[billId] ?? null;
}

export function isOwner(billId: string): boolean {
  return Boolean(ownerToken(billId));
}

/** Mints and stores a token the first time this device shares a bill. */
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

export async function ownerHash(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
