import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

// A single operator password from the environment, not a user login. The cookie is an HMAC over
// an expiry signed with that password, so changing it invalidates every session.

const COOKIE = "owe_admin";
const MAX_AGE = 60 * 60 * 8;

export const ADMIN_COOKIE = COOKIE;
export const ADMIN_MAX_AGE = MAX_AGE;

const secret = () => process.env.ADMIN_PASSWORD ?? "";

const sign = (value: string): string =>
  createHmac("sha256", secret()).update(value).digest("hex");

const constantEquals = (a: string, b: string): boolean => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  // timingSafeEqual throws on a length mismatch, which would itself leak.
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
};

export const adminConfigured = (): boolean => secret().length >= 8;

export function checkPassword(given: string): boolean {
  if (!adminConfigured()) return false;
  return constantEquals(given, secret());
}

export function issueToken(): string {
  const expires = String(Date.now() + MAX_AGE * 1000);
  const nonce = randomBytes(8).toString("hex");
  return `${expires}.${nonce}.${sign(expires + "." + nonce)}`;
}

export function tokenValid(token: string | undefined): boolean {
  if (!token || !adminConfigured()) return false;
  const [expires, nonce, mac] = token.split(".");
  if (!expires || !nonce || !mac) return false;
  if (Number(expires) < Date.now()) return false;
  return constantEquals(mac, sign(expires + "." + nonce));
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return tokenValid(jar.get(COOKIE)?.value);
}
