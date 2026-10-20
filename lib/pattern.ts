import type { PatternWord } from "../entities/receipt";

export const PATTERN_TILE = { width: 240, height: 168 };

const COLUMNS = 4;
const ROWS = 5;
const TILTS = [-10, -5, 0, 0, 5, 10];

function hash(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

// Seeded so a receipt keeps its pattern across re-renders instead of reshuffling on every edit.
export function seededRandom(seed: string): () => number {
  let state = hash(seed) || 1;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export function patternWords(seed: string): PatternWord[] {
  const random = seededRandom(seed);
  const cellWidth = PATTERN_TILE.width / COLUMNS;
  const cellHeight = PATTERN_TILE.height / ROWS;
  const words: PatternWord[] = [];

  for (let row = 0; row < ROWS; row++) {
    const stagger = row % 2 ? cellWidth / 2 : 0;
    // Staggered rows drop their last word: it would run past the tile edge and be cut off.
    const columns = stagger ? COLUMNS - 1 : COLUMNS;
    for (let column = 0; column < columns; column++) {
      words.push({
        key: `${row}-${column}`,
        x: column * cellWidth + stagger + 6 + (random() - 0.5) * 8,
        y: row * cellHeight + cellHeight * 0.72 + (random() - 0.5) * 6,
        rotate: TILTS[Math.floor(random() * TILTS.length)],
        size: 14 + Math.round(random() * 4),
        filled: random() < 0.5,
      });
    }
  }
  return words;
}
