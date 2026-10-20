/* The accent swatches in Settings, and how one is carried to the server.

   The server can only learn a device's accent from a cookie: the choice
   itself lives in localStorage. The cookie exists for one reader -- the PWA
   manifest route, which hands Chrome icons in that colour -- and anything it
   says that is not one of these six is ignored, so it cannot make the server
   draw arbitrary images. */

export const ACCENTS = ["#9be52e", "#ffd23f", "#ff8a3d", "#ff5d8f", "#9b8cff", "#3dd7d0"] as const;

export const DEFAULT_ACCENT = ACCENTS[0];

export const ACCENT_COOKIE = "owe_accent";

/** "ff5d8f", "#FF5D8F" -> "#ff5d8f" if it is one of ours, otherwise null. */
export function knownAccent(value: string | null | undefined): string | null {
  if (!value) return null;
  const hex = `#${value.trim().replace(/^#/, "").toLowerCase()}`;
  return (ACCENTS as readonly string[]).includes(hex) ? hex : null;
}
