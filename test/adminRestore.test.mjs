/* The restore path rebuilds a lost history from the bills the server still
   holds and writes it into a sync code. It is the one admin action that can
   destroy data -- writing over a code someone already syncs -- so the merge is
   tested as carefully as the arithmetic. */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { deflateRawSync } from "node:zlib";

const { buildRestore, readUserPayload, backupKey, newSyncCode } = await import(
  "../.test-build/adminRestore.js"
);

const shareKey = createHash("sha256")
  .update("owe.share.v1::9be52e-ink-cream")
  .digest();

function encodeBill(payload) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", shareKey, iv);
  const body = Buffer.concat([
    c.update(deflateRawSync(Buffer.from(JSON.stringify(payload), "utf8"))),
    c.final(),
  ]);
  return Buffer.concat([iv, body, c.getAuthTag()])
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const row = (id, payload, paid = "[]") => ({
  id,
  data: encodeBill(payload),
  paid,
  updated_at: "2026-09-01T10:00:00.000Z",
  owned: 0,
  proofs: 0,
});

/* Two diners, a 20,000 fee folded into their totals but not their shares. */
const DINNER = {
  t: "Dinner",
  c: "IDR",
  g: 120000,
  py: 0,
  pp: [
    { n: "Randy", t: 66000, ac: [{ k: "BCA", v: "9911" }], it: [{ n: "Steak", q: 1, s: 55000 }] },
    { n: "Deka", t: 54000, it: [{ n: "Pasta", q: 1, s: 45000 }] },
  ],
};

const LUNCH = {
  t: "Lunch",
  c: "IDR",
  g: 50000,
  py: 1,
  pp: [
    { n: "Reza", t: 25000, it: [{ n: "Nasi", q: 1, s: 25000 }] },
    { n: "Hafizh", t: 25000, it: [{ n: "Nasi", q: 1, s: 25000 }] },
  ],
};

const readBack = (built, code) => readUserPayload(built.data, code);

describe("restoring bills into a sync code", () => {
  test("rebuilds people, items and the fee that was folded into totals", () => {
    const code = newSyncCode();
    const built = buildRestore([row("owe-aaa", DINNER)], code);
    const draft = readBack(built, code).history[0];

    assert.equal(draft.title, "Dinner");
    assert.equal(draft.shareId, "owe-aaa");
    assert.deepEqual(draft.people.map((p) => p.name), ["Randy", "Deka"]);
    assert.equal(draft.items.reduce((s, i) => s + i.price, 0), 100000);
    // 120,000 grand total - 100,000 of items = the 20,000 that was never in a share.
    assert.equal(draft.charges.taxPct, 20000);
    assert.equal(draft.charges.taxMode, "amt");
    assert.equal(draft.summary.grandTotal, 120000);
    assert.equal(draft.payerId, draft.people[0].id);
    assert.deepEqual(draft.people[0].accounts.map((a) => a.value), ["9911"]);
  });

  test("carries who had settled, taken from the row and not the snapshot", () => {
    const code = newSyncCode();
    const built = buildRestore([row("owe-aaa", DINNER, "[1]")], code);
    const draft = readBack(built, code).history[0];
    assert.deepEqual(
      draft.paid.map((id) => draft.people.find((p) => p.id === id).name),
      ["Deka"],
    );
  });

  test("the key is the hash of the code, so only the device can read it back", () => {
    const code = newSyncCode();
    const built = buildRestore([row("owe-aaa", DINNER)], code);
    assert.equal(built.key, createHash("sha256").update(code).digest("hex"));
    assert.equal(built.key, backupKey(code));
    assert.equal(readUserPayload(built.data, "some-other-code"), null);
  });

  test("merging into a code keeps the bills already in it", () => {
    const code = newSyncCode();
    const first = buildRestore([row("owe-aaa", DINNER)], code);
    const second = buildRestore([row("owe-bbb", LUNCH)], code, readBack(first, code));

    const titles = readBack(second, code).history.map((h) => h.title).sort();
    assert.deepEqual(titles, ["Dinner", "Lunch"]);
  });

  test("restoring the same bill twice does not duplicate it", () => {
    const code = newSyncCode();
    const first = buildRestore([row("owe-aaa", DINNER)], code);
    const again = buildRestore([row("owe-aaa", DINNER)], code, readBack(first, code));
    assert.equal(readBack(again, code).history.length, 1);
  });

  test("the device's own copy of a bill wins over the rebuilt one", () => {
    const code = newSyncCode();
    const built = buildRestore([row("owe-aaa", DINNER)], code);
    const mine = readBack(built, code);
    mine.history[0].title = "Dinner (edited on my phone)";

    const merged = buildRestore([row("owe-aaa", DINNER)], code, mine);
    const out = readBack(merged, code).history;
    assert.equal(out.length, 1);
    assert.equal(out[0].title, "Dinner (edited on my phone)");
  });

  test("owners, tombstones and contacts in the existing backup survive", () => {
    const code = newSyncCode();
    const existing = {
      history: [],
      owners: { "owe-zzz": "token" },
      tombstones: { "owe-yyy": 1234 },
      contacts: [{ id: "c1", name: "Bandy" }],
    };
    const built = buildRestore([row("owe-aaa", DINNER)], code, existing);
    const out = readBack(built, code);

    assert.deepEqual(out.owners, { "owe-zzz": "token" });
    assert.deepEqual(out.tombstones, { "owe-yyy": 1234 });
    assert.deepEqual(out.contacts, [{ id: "c1", name: "Bandy" }]);
  });

  test("a bill the server cannot decrypt is skipped, not written as an empty one", () => {
    const code = newSyncCode();
    const broken = { ...row("owe-bad", DINNER), data: "not-a-cipher" };
    assert.equal(buildRestore([broken], code), null);

    const mixed = buildRestore([broken, row("owe-aaa", DINNER)], code);
    assert.deepEqual(mixed.titles, ["Dinner"]);
  });
});
