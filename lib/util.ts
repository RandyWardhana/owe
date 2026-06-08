export const uid = () => Math.random().toString(36).slice(2, 9);

export const buzz = (ms = 8) => {
  try {
    navigator.vibrate?.(ms);
  } catch {}
};

export function clampNum(s: string | number): number {
  const v = parseFloat(String(s).replace(/[^\d.]/g, ""));
  return isFinite(v) ? v : 0;
}

export const PALETTE = [
  "--p1",
  "--p2",
  "--p3",
  "--p4",
  "--p5",
  "--p6",
  "--p7",
  "--p8",
];
export const PALETTE_FG = [
  "#5B2A8C",
  "#A8421B",
  "#1A5C82",
  "#2E7D32",
  "#8A6A1E",
  "#9C3866",
  "#2A458C",
  "#5A6A2E",
];
export const personColor = (i: number) => `var(${PALETTE[i % PALETTE.length]})`;
export const personInk = (i: number) => PALETTE_FG[i % PALETTE_FG.length];

export function initials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const raw =
    parts.length === 1
      ? parts[0].slice(0, 2)
      : parts[0][0] + parts[parts.length - 1][0];
  return raw.toUpperCase();
}
