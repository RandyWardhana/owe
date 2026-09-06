/* Unassigned items, the fees that ride on them, and what claiming one costs.
   The arithmetic has to hold in three places at once -- the maker's breakdown,
   the shared link's per-person totals, and the amount a claim adds -- so it is
   pinned here rather than trusted to three call sites agreeing. */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { computeSplit } = await import("../.test-build/calc.js");

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.01, `${msg}: ${a} vs ${b}`);

const people = [
  { id: "a", name: "Aya", accounts: [] },
  { id: "b", name: "Ben", accounts: [] },
];

const bill = (assignments) => ({
  people,
  charges: { taxPct: 10, servicePct: 5, discount: 0 },
  items: [
    { id: "i1", name: "Ramen", qty: 1, price: 100000, assignedTo: assignments.i1 ?? [] },
    { id: "i2", name: "Gyoza", qty: 1, price: 60000, assignedTo: assignments.i2 ?? [] },
    { id: "i3", name: "Beer", qty: 1, price: 40000, assignedTo: assignments.i3 ?? [] },
  ],
});

const feeRate = (r) =>
  r.itemsSubtotal > 0 ? (r.tax + r.service - r.discount) / r.itemsSubtotal : 0;

describe("unassigned items and their fees", () => {
  test("with everything assigned, totals still add up to the grand total", () => {
    const r = computeSplit(bill({ i1: ["a"], i2: ["b"], i3: ["a", "b"] }));
    near(r.perPerson[0].total + r.perPerson[1].total, r.grandTotal, "sum of shares");
    near(r.grandTotal, 200000 * 1.15, "grand total");
  });

  test("an unclaimed item is charged to nobody, fees included", () => {
    const r = computeSplit(bill({ i1: ["a"], i2: ["b"] }));

    near(r.unassignedSubtotal, 40000, "unassigned subtotal");
    // Aya had 100k of a 200k bill, so she carries 100k of items plus the tax
    // and service on that 100k -- and nothing on the beer nobody has claimed.
    near(r.perPerson[0].total, 100000 * 1.15, "Aya");
    near(r.perPerson[1].total, 60000 * 1.15, "Ben");

    const uncollected = r.grandTotal - (r.perPerson[0].total + r.perPerson[1].total);
    near(uncollected, 40000 * 1.15, "exactly the beer, with its own fees");
  });

  test("claiming an unassigned item costs the same as having been assigned it", () => {
    const open = computeSplit(bill({ i1: ["a"], i2: ["b"] }));
    const rate = feeRate(open);
    const claimCost = 40000 * (1 + rate);

    const assigned = computeSplit(bill({ i1: ["a"], i2: ["b"], i3: ["a"] }));
    near(open.perPerson[0].total + claimCost, assigned.perPerson[0].total, "Aya after claiming");
    near(open.perPerson[1].total, assigned.perPerson[1].total, "Ben is untouched");
  });

  test("claiming every loose item restores the grand total exactly", () => {
    const open = computeSplit(bill({ i1: ["a"] }));
    const rate = feeRate(open);
    const claimed = open.unassignedItems.reduce(
      (sum, item) => sum + item.qty * item.price * (1 + rate),
      0,
    );
    const collected = open.perPerson.reduce((sum, p) => sum + p.total, 0) + claimed;
    near(collected, open.grandTotal, "everything is accounted for");
  });

  test("a claim never moves anyone else's total", () => {
    const before = computeSplit(bill({ i1: ["a"], i2: ["b"] }));
    const after = computeSplit(bill({ i1: ["a"], i2: ["b"], i3: ["b"] }));
    near(before.perPerson[0].total, after.perPerson[0].total, "Aya unchanged by Ben's claim");
  });

  test("a shared item claimed by several splits between them", () => {
    const open = computeSplit(bill({ i1: ["a"] }));
    const rate = feeRate(open);
    // The beer, taken by both of them.
    const each = (40000 * (1 + rate)) / 2;

    const assigned = computeSplit(bill({ i1: ["a"], i3: ["a", "b"] }));
    near(open.perPerson[0].total + each, assigned.perPerson[0].total, "Aya's half");
    near(open.perPerson[1].total + each, assigned.perPerson[1].total, "Ben's half");
  });

  test("claiming a shared item costs each of them less than taking it alone", () => {
    const rate = feeRate(computeSplit(bill({ i1: ["a"] })));
    const alone = 40000 * (1 + rate);
    const shared = alone / 2;
    assert.ok(shared < alone);
    near(shared * 2, alone, "the two halves are the whole thing, nothing lost");
  });

  test("a bill where nothing is assigned charges nobody anything", () => {
    const r = computeSplit(bill({}));
    near(r.perPerson[0].total, 0, "Aya");
    near(r.perPerson[1].total, 0, "Ben");
    near(r.unassignedSubtotal, 200000, "all of it is loose");
    assert.equal(r.unassignedItems.length, 3);
  });

  test("a fixed-amount fee behaves the same way", () => {
    const r = computeSplit({
      people,
      charges: { taxPct: 30000, taxMode: "amt", servicePct: 0, discount: 0 },
      items: [
        { id: "i1", name: "A", qty: 1, price: 100000, assignedTo: ["a"] },
        { id: "i2", name: "B", qty: 1, price: 100000, assignedTo: [] },
      ],
    });
    // Half the items are loose, so Aya carries half the fixed 30k, not all of it.
    near(r.perPerson[0].total, 100000 + 15000, "Aya");
  });
});
