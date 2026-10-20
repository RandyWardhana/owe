import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { ACCENTS, DEFAULT_ACCENT, knownAccent } from "../.test-build/accents.js";
import { BASE_MANIFEST, buildManifest } from "../.test-build/pwaManifest.js";
import { OWE_MARK_PATH } from "../.test-build/brandMark.js";

/* The accent manifest must never be able to do worse than the old static
   one. Every case that is not "a known, non-default accent with the feature
   on" has to come back as the original manifest, unchanged. */

test("no cookie, default lime, unknown or tampered values, and the kill switch all give the original manifest", () => {
  for (const value of [undefined, null, "", "9be52e", "#9BE52E", "zzzzzz", "ff5d8f; drop", "../../etc", "123456"]) {
    assert.deepEqual(buildManifest(value, true), BASE_MANIFEST, `cookie ${value}`);
  }
  assert.deepEqual(buildManifest("ff5d8f", false), BASE_MANIFEST, "kill switch");
});

test("a known accent swaps only the icons and theme colour", () => {
  const m = buildManifest("FF5D8F", true);
  assert.equal(m.theme_color, "#ff5d8f");
  assert.deepEqual(
    m.icons.map((i) => [i.src, i.sizes, i.purpose]),
    [
      ["/pwa-icon/ff5d8f/192", "192x192", "any"],
      ["/pwa-icon/ff5d8f/512", "512x512", "any"],
      ["/pwa-icon/ff5d8f/maskable-512", "512x512", "maskable"],
    ],
  );
  // Identity fields an installed app is tied to must never move.
  for (const key of ["name", "short_name", "start_url", "scope", "display"]) {
    assert.equal(m[key], BASE_MANIFEST[key], key);
  }
  assert.equal("id" in m, false);
});

test("knownAccent only accepts the six swatches", () => {
  assert.equal(ACCENTS.length, 6);
  assert.equal(DEFAULT_ACCENT, "#9be52e");
  assert.equal(knownAccent("#3DD7D0"), "#3dd7d0");
  assert.equal(knownAccent("#000000"), null);
});

test("the server's copy of the owe mark matches public/icon.svg", () => {
  const svg = readFileSync(new URL("../public/icon.svg", import.meta.url), "utf8");
  const path = svg.match(/<path d="([^"]+)"/)[1];
  assert.equal(OWE_MARK_PATH, path);
});
