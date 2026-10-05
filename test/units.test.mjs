/* One line, several people, not one each: "6x Sparkling Lemon" where one person
   had two. The line divides by how many each had, not by heads. */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { computeSplit, unitsOf } = await import("../.test-build/calc.js");

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.01, `${msg}: ${a} vs ${b}`);

const people = ["a", "b", "c", "d", "e"].map((id) => ({ id, name: id, accounts: [] }));

const lemon = (units) => ({
  people,
  charges: { taxPct: 10, servicePct: 0, discount: 0 },
  items: [
    { id: "i1", name: "Sparkling Lemon", qty: 6, price: 18000,
      assignedTo: ["a", "b", "c", "d", "e"], units, countEach: true },
  ],
});

describe("per-person units on a shared line", () => {
  test("without counts it is the plain even split", () => {
    const r = computeSplit(lemon(undefined));
    r.perPerson.forEach((p) => near(p.subtotal, 108000 / 5, p.id));
    assert.ok(r.perPerson.every((p) => p.items[0].units === undefined));
  });

  test("whoever had two pays for two", () => {
    const r = computeSplit(lemon({ e: 2 }));
    near(r.perPerson[4].subtotal, 36000, "two lemons");
    near(r.perPerson[0].subtotal, 18000, "one lemon");
    near(r.perPerson.reduce((s, p) => s + p.total, 0), r.grandTotal, "sum of shares");
    assert.equal(r.perPerson[4].items[0].units, 2);
    assert.equal(r.perPerson[0].items[0].units, 1);
  });

  test("counts are clamped to between 1 and the line's qty", () => {
    const it = { qty: 6, units: { a: 0, b: 99, c: -3 } };
    assert.equal(unitsOf(it, "a"), 1);
    assert.equal(unitsOf(it, "b"), 6);
    assert.equal(unitsOf(it, "c"), 1);
    assert.equal(unitsOf(it, "z"), 1);
  });
});

describe("shared lines ignore counts", () => {
  test("counts left over from Count each do not apply once the line is shared again", () => {
    const bill = lemon({ e: 2 });
    bill.items[0].countEach = false;
    const shared = computeSplit(bill);
    shared.perPerson.forEach((p) => near(p.subtotal, 108000 / 5, p.id));
    assert.ok(shared.perPerson.every((p) => p.items[0].units === undefined));
  });
});
