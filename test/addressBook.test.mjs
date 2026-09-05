/* Unit tests for the device-local address book.
   The module is TypeScript, so this compiles lib/ to a temp dir first (see
   pretest) and imports the emitted JS. localStorage is stubbed, because the
   whole point of the module is what survives in it. */
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

const { remember, accountsFor, contacts, isKnown, forget } = await import(
  "../.test-build/addressBook.js"
);

const person = (name, accounts) => ({
  id: "p" + name,
  name,
  accounts: accounts.map((a, i) => ({ id: "a" + i, key: a[0], value: a[1] })),
});

describe("remembering who to pay", () => {
  beforeEach(() => store.clear());

  test("keeps a person who has an account", () => {
    remember([person("Budi", [["bank", "BCA 123"]])]);
    assert.equal(isKnown("Budi"), true);
    assert.deepEqual(
      accountsFor("Budi").map((a) => [a.key, a.value]),
      [["bank", "BCA 123"]],
    );
  });

  test("ignores a bare name — it answers nobody's question", () => {
    remember([person("Ghost", [])]);
    assert.equal(isKnown("Ghost"), false);
    assert.deepEqual(accountsFor("Ghost"), []);
  });

  test("ignores blank account values", () => {
    remember([person("Blank", [["gopay", "   "]])]);
    assert.equal(isKnown("Blank"), false);
  });

  test("matches the name however it was capitalised or spaced", () => {
    remember([person("Siti", [["ovo", "0812"]])]);
    assert.equal(isKnown("  siTi "), true);
    assert.equal(accountsFor("SITI").length, 1);
  });

  test("a later bill corrects the stored number", () => {
    remember([person("Budi", [["bank", "BCA 111"]])]);
    remember([person("Budi", [["bank", "BCA 222"]])]);
    const saved = accountsFor("Budi");
    assert.equal(saved.length, 1, "replaced, not appended");
    assert.equal(saved[0].value, "BCA 222");
  });

  test("hands back fresh ids, so two bills never share an account object", () => {
    remember([person("Budi", [["bank", "BCA 123"]])]);
    const first = accountsFor("Budi");
    const second = accountsFor("Budi");
    assert.notEqual(first[0].id, second[0].id);
  });

  test("keeps several people from one bill", () => {
    remember([
      person("A", [["bank", "1"]]),
      person("B", [["dana", "2"]]),
      person("C", []),
    ]);
    assert.deepEqual(contacts().map((c) => c.name).sort(), ["A", "B"]);
  });

  test("most recently used comes first", async () => {
    remember([person("Old", [["bank", "1"]])]);
    await new Promise((r) => setTimeout(r, 5));
    remember([person("New", [["bank", "2"]])]);
    assert.equal(contacts()[0].name, "New");
  });

  test("an unknown name yields nothing", () => {
    assert.deepEqual(accountsFor("Nobody"), []);
    assert.equal(isKnown(""), false);
  });

  test("forget removes one and leaves the rest", () => {
    remember([person("A", [["bank", "1"]]), person("B", [["bank", "2"]])]);
    forget("a");
    assert.equal(isKnown("A"), false);
    assert.equal(isKnown("B"), true);
  });

  test("survives corrupt storage rather than throwing", () => {
    store.set("owe.contacts.v1", "{not json");
    assert.deepEqual(contacts(), []);
    assert.doesNotThrow(() => remember([person("X", [["bank", "9"]])]));
    assert.equal(isKnown("X"), true);
  });
});
