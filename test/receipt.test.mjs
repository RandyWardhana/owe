import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { receiptFromDraft, receiptFromShared, stillOwing } = await import("../.test-build/receipt.js");

const people = [
  { id: "p1", name: "Randy", accounts: [] },
  { id: "p2", name: "Adrian", accounts: [] },
  { id: "p3", name: "Reza", accounts: [] },
];

const draft = {
  id: "d1",
  createdAt: 1,
  title: "J.CO",
  items: [
    { id: "i1", name: "Iced Chocolate", qty: 1, price: 30000, assignedTo: ["p1"] },
    { id: "i2", name: "Cronut", qty: 3, price: 20000, assignedTo: ["p1", "p2", "p3"] },
  ],
  people,
  charges: { taxPct: 10, servicePct: 0, discount: 0 },
  payerId: "p1",
  source: "manual",
  step: "breakdown",
  currency: "IDR",
  paid: ["p2"],
};

describe("receipt from a draft", () => {
  const receipt = receiptFromDraft(draft, "USD");

  test("prints one line per item with who had it", () => {
    assert.deepEqual(
      receipt.lines.map((line) => [line.name, line.amount, line.people.map((person) => person.name)]),
      [
        ["Iced Chocolate", 30000, ["Randy"]],
        ["Cronut", 60000, ["Randy", "Adrian", "Reza"]],
      ],
    );
  });

  test("totals match the split, and the bill's own currency wins", () => {
    assert.equal(receipt.subtotal, 90000);
    assert.deepEqual(receipt.charges, [{ key: "tax", amount: 9000 }]);
    assert.equal(receipt.total, 99000);
    assert.equal(receipt.currency, "IDR");
    assert.equal(receipt.payerName, "Randy");
  });

  test("stubs mark the payer and whoever has paid back", () => {
    const byName = Object.fromEntries(receipt.stubs.map((stub) => [stub.name, stub]));
    assert.equal(byName.Randy.isPayer, true);
    assert.equal(byName.Randy.paid, true);
    assert.equal(byName.Adrian.paid, true);
    assert.equal(byName.Reza.paid, false);
  });

  test("counts who still owes, never the payer or a zero share", () => {
    assert.equal(stillOwing(receipt), 1);
    assert.equal(stillOwing(receiptFromDraft({ ...draft, paid: ["p2", "p3"] }, "IDR")), 0);
  });

  test("an empty draft prints no lines and no charges", () => {
    const empty = receiptFromDraft({ ...draft, items: [], people: [], payerId: null, paid: [] }, "IDR");
    assert.deepEqual(empty.lines, []);
    assert.deepEqual(empty.charges, []);
    assert.equal(empty.total, 0);
    assert.equal(empty.payerName, null);
  });
});

describe("receipt from a shared bill", () => {
  const bill = {
    version: 1,
    title: "Ramen",
    currency: "IDR",
    grandTotal: 120000,
    payerIndex: 0,
    people: [
      { name: "Aya", total: 60000, accounts: [], items: [{ name: "Gyoza", qty: 2, share: 25000, split: 2 }, { name: "Ramen", qty: 1, share: 30000 }] },
      { name: "Ben", total: 60000, accounts: [], items: [{ name: "Gyoza", qty: 2, share: 25000, split: 2 }, { name: "Ramen", qty: 1, share: 30000 }] },
    ],
    paidIndices: [],
    claimable: [],
    feeRate: 0.1,
  };

  test("shared items are summed back into one line", () => {
    const receipt = receiptFromShared(bill, [1]);
    const gyoza = receipt.lines.find((line) => line.name === "Gyoza");
    assert.equal(gyoza.amount, 50000);
    assert.deepEqual(gyoza.people.map((person) => person.name), ["Aya", "Ben"]);
    assert.equal(receipt.subtotal, 110000);
    assert.deepEqual(receipt.charges, [{ key: "fees", amount: 10000 }]);
    assert.equal(receipt.stubs[1].paid, true);
  });

  test("the same item ordered separately by two people adds up instead of merging", () => {
    const orders = {
      ...bill,
      people: bill.people.map((person) => ({ ...person, items: [{ name: "Ocha", qty: 1, share: 15000 }] })),
    };
    const ocha = receiptFromShared(orders).lines;
    assert.equal(ocha.length, 1);
    assert.equal(ocha[0].qty, 2);
    assert.equal(ocha[0].amount, 30000);
  });

  test("a bill shared without item detail shows only its total", () => {
    const bare = { ...bill, people: bill.people.map((person) => ({ ...person, items: [] })) };
    const receipt = receiptFromShared(bare);
    assert.deepEqual(receipt.lines, []);
    assert.deepEqual(receipt.charges, []);
    assert.equal(receipt.total, 120000);
  });
});
