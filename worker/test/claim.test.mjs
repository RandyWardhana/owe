/* Claiming an unassigned item from the shared link. Run against
   `wrangler dev --local`:
     OWE_DB_URL=http://127.0.0.1:8799 OWE_DB_SECRET=local-test-secret \
       node --test test/claim.test.mjs                                   */
import { test, before, describe } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";

import { assertNotProduction } from "./guard.mjs";

const BASE = (process.env.OWE_DB_URL ?? "").replace(/\/+$/, "");
const SECRET = process.env.OWE_DB_SECRET ?? "";
const sha256 = (v) => createHash("sha256").update(v).digest("hex");

const call = (path, init = {}) =>
  fetch(BASE + path, {
    ...init,
    headers: {
      "x-owe-secret": SECRET,
      ...(init.json ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
    ...(init.json ? { body: JSON.stringify(init.json) } : {}),
  });

const newBill = async (extra = {}) => {
  const id = "__claim_" + randomUUID().slice(0, 8);
  await call("/bill", { method: "POST", json: { id, data: "cipher", ...extra } });
  return id;
};

const readBill = async (id) => (await call(`/bill?id=${id}`)).json();

describe("claiming unassigned items", () => {
  before(() => {
    assertNotProduction(BASE);
    assert.ok(BASE && SECRET, "set OWE_DB_URL and OWE_DB_SECRET");
  });

  test("a new bill starts with no claims", async () => {
    const id = await newBill();
    assert.deepEqual((await readBill(id)).claims, {});
  });

  test("anyone with the link can claim, without the owner token", async () => {
    const id = await newBill({ owner_hash: sha256("maker-device") });

    const res = await call("/claim", { method: "POST", json: { id, item: "i1", person: 2 } });
    assert.equal(res.status, 200);
    assert.deepEqual((await readBill(id)).claims, { i1: [2] });
  });

  test("several people can be on the same item", async () => {
    const id = await newBill();
    for (const person of [2, 0, 1]) {
      await call("/claim", { method: "POST", json: { id, item: "plate", person } });
    }
    assert.deepEqual((await readBill(id)).claims, { plate: [0, 1, 2] }, "kept in order, no duplicates");
  });

  test("claiming twice does not add someone twice", async () => {
    const id = await newBill();
    await call("/claim", { method: "POST", json: { id, item: "plate", person: 1 } });
    await call("/claim", { method: "POST", json: { id, item: "plate", person: 1 } });
    assert.deepEqual((await readBill(id)).claims, { plate: [1] });
  });

  test("stepping off leaves the others on it", async () => {
    const id = await newBill();
    await call("/claim", { method: "POST", json: { id, item: "plate", person: 0 } });
    await call("/claim", { method: "POST", json: { id, item: "plate", person: 1 } });
    await call("/claim", { method: "POST", json: { id, item: "plate", person: 0, on: false } });
    assert.deepEqual((await readBill(id)).claims, { plate: [1] });
  });

  test("the last person stepping off drops the item entirely", async () => {
    const id = await newBill();
    await call("/claim", { method: "POST", json: { id, item: "plate", person: 1 } });
    await call("/claim", { method: "POST", json: { id, item: "plate", person: 1, on: false } });
    assert.deepEqual((await readBill(id)).claims, {}, "not an empty array left behind");
  });

  test("a row written before claims were sets still reads", async () => {
    const id = await newBill();
    await call("/claim", { method: "POST", json: { id, item: "old", person: 3 } });
    // Simulate the old single-holder shape landing in the column.
    await call("/claim", { method: "POST", json: { id, item: "old", person: 3, on: false } });
    assert.deepEqual((await readBill(id)).claims, {});
  });

  test("claiming a second item keeps the first", async () => {
    const id = await newBill();
    await call("/claim", { method: "POST", json: { id, item: "i1", person: 0 } });
    await call("/claim", { method: "POST", json: { id, item: "i2", person: 1 } });
    assert.deepEqual((await readBill(id)).claims, { i1: [0], i2: [1] });
  });

  test("a second claimer joins rather than replacing the first", async () => {
    const id = await newBill();
    await call("/claim", { method: "POST", json: { id, item: "i1", person: 0 } });
    await call("/claim", { method: "POST", json: { id, item: "i1", person: 3 } });
    assert.deepEqual((await readBill(id)).claims, { i1: [0, 3] });
  });

  test("a null person releases the item", async () => {
    const id = await newBill();
    await call("/claim", { method: "POST", json: { id, item: "i1", person: 1 } });
    await call("/claim", { method: "POST", json: { id, item: "i1", person: null } });
    assert.deepEqual((await readBill(id)).claims, {});
  });

  test("a claim held by someone already marked paid is frozen", async () => {
    const id = await newBill({ owner_hash: sha256("maker") });
    await call("/claim", { method: "POST", json: { id, item: "i1", person: 1 } });
    await call("/bill", {
      method: "POST",
      json: { id, paid: [1] },
      headers: { "x-owe-owner": "maker" },
    });

    const res = await call("/claim", { method: "POST", json: { id, item: "i1", person: 2 } });
    assert.equal(res.status, 409, "must not rewrite a settled person's amount");
    assert.deepEqual((await readBill(id)).claims, { i1: [1] });
  });

  test("an unrelated item stays claimable after someone settles", async () => {
    const id = await newBill({ owner_hash: sha256("maker") });
    await call("/bill", {
      method: "POST",
      json: { id, paid: [1] },
      headers: { "x-owe-owner": "maker" },
    });
    const res = await call("/claim", { method: "POST", json: { id, item: "loose", person: 1 } });
    assert.equal(res.status, 200);
    assert.deepEqual((await readBill(id)).claims, { loose: [1] });
  });

  test("claims survive a data-only rewrite of the bill", async () => {
    const id = await newBill();
    await call("/claim", { method: "POST", json: { id, item: "i1", person: 2 } });
    await call("/bill", { method: "POST", json: { id, data: "cipher-2" } });
    const after = await readBill(id);
    assert.equal(after.data, "cipher-2");
    assert.deepEqual(after.claims, { i1: [2] });
  });

  test("garbage is rejected rather than stored", async () => {
    const id = await newBill();
    assert.equal((await call("/claim", { method: "POST", json: { id } })).status, 400);
    assert.equal((await call("/claim", { method: "POST", json: { item: "i1" } })).status, 400);
    assert.equal(
      (await call("/claim", { method: "POST", json: { id: "__nope", item: "i1", person: 0 } })).status,
      404,
    );
    await call("/claim", { method: "POST", json: { id, item: "i1", person: -3 } });
    assert.deepEqual((await readBill(id)).claims, {}, "a negative index is a release, not a claim");
  });
});
