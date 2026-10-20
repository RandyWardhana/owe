// The accent cookie feeds the PWA manifest route; any value not in ACCENTS is ignored so the
// cookie cannot make the server draw arbitrary images.

export const ACCENTS = ["#9be52e", "#ffd23f", "#ff8a3d", "#ff5d8f", "#9b8cff", "#3dd7d0"] as const;

export const DEFAULT_ACCENT = ACCENTS[0];

export const ACCENT_COOKIE = "owe_accent";

/** "ff5d8f", "#FF5D8F" -> "#ff5d8f" if it is one of ours, otherwise null. */
export function knownAccent(value: string | null | undefined): string | null {
  if (!value) return null;
  const hex = `#${value.trim().replace(/^#/, "").toLowerCase()}`;
  return (ACCENTS as readonly string[]).includes(hex) ? hex : null;
}
