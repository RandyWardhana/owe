import type { Account, PayMethodKey } from "./types";

/* Payment numbers are shown masked and copied in full. The masked string is
   stored next to the real value (Account.masked) rather than derived at render
   time, so a shared bill carries exactly what the owner saw when they typed it
   — and so a hand-written mask could override the default later. */

const DOT = "•";
// Cap the dot run: a 16-digit account shouldn't turn into a 12-dot wall.
const MAX_DOTS = 6;

/** `1234567890` → `••••••7890`, `randy@mail.com` → `ra•••@mail.com`. */
export function maskValue(value: string, key?: PayMethodKey): string {
  const raw = (value || "").trim();
  if (!raw) return "";

  const at = raw.lastIndexOf("@");
  if (at > 0) {
    const user = raw.slice(0, at);
    const domain = raw.slice(at);
    const head = user.slice(0, Math.min(2, user.length - 1));
    return head + DOT.repeat(Math.min(user.length - head.length, MAX_DOTS)) + domain;
  }

  const tailLen = raw.length <= 4 ? 1 : 4;
  const hidden = Math.min(raw.length - tailLen, MAX_DOTS);
  if (hidden <= 0) return raw;
  return DOT.repeat(hidden) + raw.slice(-tailLen);
}

/** What to render for an account — the stored mask, or one derived on the fly
    for accounts saved before masking existed. */
export function maskedOf(account: {
  key: PayMethodKey;
  value: string;
  masked?: string;
}): string {
  return account.masked || maskValue(account.value, account.key);
}

/** Keeps `masked` in step with `value`. Call on every edit. */
export function withMask(account: Account): Account {
  return { ...account, masked: maskValue(account.value, account.key) };
}
