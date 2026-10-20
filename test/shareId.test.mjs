import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

const { newShareId, legacyShareId, resolveShareId } = await import(
  "../.test-build/shareId.js"
);
const { claimBill } = await import("../.test-build/billOwner.js");

const bill = (title, total, people) => ({
  version: 1,
  title,
  currency: "IDR",
  grandTotal: total,
  payerIndex: 0,
  people: people.map(([name, t]) => ({ name, total: t, accounts: [], items: [] })),
  paidIndices: [],
  claimable: [],
  feeRate: 0,
});

const dinner = bill("Ramen night", 345000, [["Aya", 115000], ["Ben", 230000]]);

describe("minting a new id", () => {
  test("keeps the owe- prefix the share route matches on", () => {
    assert.match(newShareId(), /^owe-[a-z0-9]+$/i);
  });

  test("carries enough randomness to be unguessable", () => {
    assert.match(newShareId(), /^owe-[1-9A-HJ-NP-Za-km-z]{12}$/);
  });

  test("never repeats", () => {
    const seen = new Set(Array.from({ length: 5000 }, () => newShareId()));
    assert.equal(seen.size, 5000);
  });

  test("does not depend on the bill, so two identical bills differ", () => {
    assert.notEqual(newShareId(), newShareId());
  });
});

describe("the legacy content hash", () => {
  test("is still stable, so old rows stay reachable", () => {
    assert.equal(legacyShareId(dinner), legacyShareId({ ...dinner }));
  });

  test("changes when the bill does — which is why ids had to stop being derived", () => {
    const edited = bill("Ramen night", 345000, [["Aya", 120000], ["Ben", 225000]]);
    assert.notEqual(legacyShareId(dinner), legacyShareId(edited));
  });
});

describe("resolving which id to publish under", () => {
  beforeEach(() => store.clear());

  test("an id the bill already carries is never replaced", () => {
    assert.equal(resolveShareId(dinner, "owe-alreadyminted"), "owe-alreadyminted");
  });

  test("a bill this device shared before the change keeps its old id", () => {
    claimBill(legacyShareId(dinner));
    assert.equal(resolveShareId(dinner, null), legacyShareId(dinner));
  });

  test("anything else gets a fresh random id, not the content hash", () => {
    const id = resolveShareId(dinner, null);
    assert.notEqual(id, legacyShareId(dinner));
    assert.equal(id.length, 4 + 12);
  });
});
