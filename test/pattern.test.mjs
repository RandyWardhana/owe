import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { patternWords, PATTERN_TILE } = await import("../.test-build/pattern.js");

describe("receipt watermark", () => {
  test("the same seed always lays out the same words", () => {
    assert.deepEqual(patternWords("bill-1"), patternWords("bill-1"));
  });

  test("different receipts get different layouts", () => {
    assert.notDeepEqual(patternWords("bill-1"), patternWords("bill-2"));
  });

  test("mixes outlined and filled words", () => {
    const words = patternWords("bill-1");
    assert.ok(words.some((word) => word.filled));
    assert.ok(words.some((word) => !word.filled));
  });

  test("every word fits inside the tile, so none is cut at the seam", () => {
    for (const seed of ["bill-3", "bill-4", "idle", "scan"]) {
      for (const word of patternWords(seed)) {
        assert.ok(word.x >= 0 && word.x + 40 <= PATTERN_TILE.width, `${seed} x ${word.x}`);
        assert.ok(word.y - word.size >= 0 && word.y + 4 <= PATTERN_TILE.height, `${seed} y ${word.y}`);
      }
    }
  });
});
