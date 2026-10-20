import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { mergeHistories, HISTORY_LIMIT, changedAt } = await import(
  "../.test-build/historyMerge.js"
);

const bill = (id, updatedAt, extra = {}) => ({
  id,
  createdAt: updatedAt - 1000,
  updatedAt,
  title: id,
  items: [],
  people: [],
  charges: { taxPct: 0, servicePct: 0, discount: 0 },
  payerId: null,
  source: "manual",
  step: "breakdown",
  ...extra,
});

const ids = (result) => result.history.map((d) => d.id);

describe("merging two devices' histories", () => {
  test("keeps bills that exist on only one side", () => {
    const out = mergeHistories([bill("a", 100)], [bill("b", 200)]);
    assert.deepEqual(ids(out), ["b", "a"]);
  });

  test("the newer edit of the same bill wins, whichever side it is on", () => {
    const local = mergeHistories([bill("a", 300)], [bill("a", 100)]);
    assert.equal(local.history[0].updatedAt, 300);

    const remote = mergeHistories([bill("a", 100)], [bill("a", 300)]);
    assert.equal(remote.history[0].updatedAt, 300);
    assert.equal(remote.history.length, 1);
  });

  test("a genuine tie goes to the local copy", () => {
    const out = mergeHistories(
      [bill("a", 100, { title: "mine" })],
      [bill("a", 100, { title: "theirs" })],
    );
    assert.equal(out.history[0].title, "mine");
  });

  test("entries with no updatedAt fall back to createdAt", () => {
    const old = { ...bill("a", 5000), updatedAt: undefined };
    assert.equal(changedAt(old), 4000);
    assert.equal(changedAt({ id: "x" }), 0);

    assert.equal(mergeHistories([old], [bill("a", 3000)]).history[0].createdAt, 4000);
    assert.equal(mergeHistories([old], [bill("a", 9000)]).history[0].updatedAt, 9000);
  });

  test("results come back newest first", () => {
    const out = mergeHistories([bill("a", 100), bill("c", 300)], [bill("b", 200)]);
    assert.deepEqual(ids(out), ["c", "b", "a"]);
  });
});

describe("deletes that must stay deleted", () => {
  test("a tombstone newer than the bill removes it", () => {
    const out = mergeHistories([], [bill("a", 100)], { a: 200 }, {});
    assert.deepEqual(ids(out), []);
  });

  test("a delete on the other device reaches this one", () => {
    const out = mergeHistories([bill("a", 100)], [], {}, { a: 200 });
    assert.deepEqual(ids(out), []);
  });

  test("re-creating a bill after deleting it survives the merge", () => {
    const out = mergeHistories([bill("a", 300)], [], { a: 200 }, {});
    assert.deepEqual(ids(out), ["a"]);
  });

  test("both sides' tombstones are carried forward", () => {
    const out = mergeHistories([], [], { a: 1 }, { b: 2 });
    assert.deepEqual(out.tombstones, { a: 1, b: 2 });
  });

  test("the later record of the same delete wins", () => {
    const out = mergeHistories([], [], { a: 900 }, { a: 100 });
    assert.equal(out.tombstones.a, 900);
  });
});

describe("the cap", () => {
  test("keeps the newest up to the limit", () => {
    const many = Array.from({ length: 10 }, (_, i) => bill("b" + i, i * 10));
    const out = mergeHistories(many, [], {}, {}, 4);
    assert.deepEqual(ids(out), ["b9", "b8", "b7", "b6"]);
  });

  test("is high enough that an ordinary history is untouched", () => {
    const many = Array.from({ length: 60 }, (_, i) => bill("b" + i, i * 10));
    assert.equal(mergeHistories(many, []).history.length, 60);
    assert.ok(HISTORY_LIMIT >= 200, "the old limit of 30 truncated real users");
  });
});
