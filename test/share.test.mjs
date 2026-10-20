import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { encodeShare, decodeShare, encryptShare, decryptShare } = await import(
  "../.test-build/share.js"
);

const plain = (value) => JSON.parse(JSON.stringify(value));

const full = {
  version: 1,
  title: "Ramen night",
  currency: "IDR",
  grandTotal: 345000,
  payerIndex: 1,
  people: [
    {
      name: "Aya",
      total: 115000,
      accounts: [{ key: "gopay", value: "0812…" }],
      items: [{ name: "Ramen", qty: 1, share: 100000, split: 2 }],
    },
    {
      name: "Ben",
      total: 230000,
      accounts: [{ key: "bank", value: "BCA 123" }],
      items: [{ name: "Gyoza", qty: 2, share: 60000 }],
    },
  ],
  paidIndices: [0],
  claimable: [{ id: "i3", name: "Beer", qty: 1, amount: 40000 }],
  feeRate: 0.15,
};

describe("the plain base64url link", () => {
  test("survives a round trip intact", () => {
    assert.deepEqual(plain(decodeShare(encodeShare(full))), full);
  });

  test("encodes to a URL-safe string with no padding", () => {
    assert.match(encodeShare(full), /^[A-Za-z0-9_-]+$/);
  });

  test("keeps non-ASCII names", () => {
    const bill = { ...full, title: "Ayam Bakar 🍗 · Café" };
    assert.equal(decodeShare(encodeShare(bill)).title, bill.title);
  });

  test("returns null rather than throwing on a mangled link", () => {
    assert.equal(decodeShare("not-a-real-payload"), null);
    assert.equal(decodeShare(""), null);
  });
});

describe("the encrypted link", () => {
  test("survives a round trip intact", async () => {
    assert.deepEqual(plain(await decryptShare(await encryptShare(full))), full);
  });

  test("a fresh iv each time, so the same bill does not encode identically", async () => {
    const a = await encryptShare(full);
    const b = await encryptShare(full);
    assert.notEqual(a, b);
    assert.deepEqual(plain(await decryptShare(a)), plain(await decryptShare(b)));
  });

  test("compresses: the ciphertext is shorter than the plain encoding", async () => {
    const big = {
      ...full,
      people: Array.from({ length: 12 }, (_, i) => ({
        name: "Person " + i,
        total: 100000,
        accounts: [{ key: "bank", value: "BCA 1234567890" }],
        items: [{ name: "Nasi goreng spesial", qty: 1, share: 100000 }],
      })),
    };
    assert.ok((await encryptShare(big)).length < encodeShare(big).length);
  });

  test("falls back to the plain decoder for a pre-encryption link", async () => {
    assert.deepEqual(plain(await decryptShare(encodeShare(full))), full);
  });
});

describe("links made before a field existed", () => {
  test("a payload with no claimable items or fee rate still decodes", () => {
    const wire = { v: 1, t: "Old", c: "IDR", g: 1000, py: 0, pp: [{ n: "Aya", t: 1000, ac: [] }] };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(wire))))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const bill = decodeShare(encoded);
    assert.deepEqual(bill.claimable, []);
    assert.equal(bill.feeRate, 0);
    assert.deepEqual(bill.paidIndices, []);
    assert.deepEqual(bill.people[0].items, []);
  });
});
