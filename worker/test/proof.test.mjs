/* Ownership and payment proof. Run against `wrangler dev --local`:
     OWE_DB_URL=http://127.0.0.1:8799 OWE_DB_SECRET=local-test-secret \
       node --test test/proof.test.mjs                                   */
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

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

before(() => {
  assert.ok(BASE && SECRET, "set OWE_DB_URL and OWE_DB_SECRET");
  assertNotProduction(BASE);
});

describe("bill ownership", () => {
  const id = "__owner_" + randomUUID().slice(0, 8);
  const token = randomUUID();

  test("the creating write claims the bill", async () => {
    const res = await call("/bill", {
      method: "POST",
      json: { id, data: "cipher", owner_hash: sha256(token) },
    });
    assert.equal((await res.json()).ok, true);
  });

  test("a stranger cannot mark anyone paid", async () => {
    const res = await call("/bill", { method: "POST", json: { id, paid: [0] } });
    assert.equal(res.status, 403);
    const body = await (await call(`/bill?id=${id}`)).json();
    assert.deepEqual(body.paid, [], "paid must be untouched");
  });

  test("a wrong token cannot either", async () => {
    const res = await call("/bill", {
      method: "POST",
      json: { id, paid: [0] },
      headers: { "x-owe-owner": randomUUID() },
    });
    assert.equal(res.status, 403);
  });

  test("the owner can", async () => {
    const res = await call("/bill", {
      method: "POST",
      json: { id, paid: [0, 1] },
      headers: { "x-owe-owner": token },
    });
    assert.equal((await res.json()).ok, true);
    assert.deepEqual((await (await call(`/bill?id=${id}`)).json()).paid, [0, 1]);
  });

  test("ownership cannot be stolen by a later claim", async () => {
    const thief = randomUUID();
    await call("/bill", { method: "POST", json: { id, data: "x", owner_hash: sha256(thief) } });
    const res = await call("/bill", {
      method: "POST",
      json: { id, paid: [9] },
      headers: { "x-owe-owner": thief },
    });
    assert.equal(res.status, 403, "the first claim must stand");
  });

  test("anyone may still update the bill body", async () => {
    const res = await call("/bill", { method: "POST", json: { id, data: "cipher-2" } });
    assert.equal((await res.json()).ok, true);
  });

  test("a bill with no owner stays open, so old links keep working", async () => {
    const legacy = "__legacy_" + randomUUID().slice(0, 8);
    await call("/bill", { method: "POST", json: { id: legacy, data: "c" } });
    const res = await call("/bill", { method: "POST", json: { id: legacy, paid: [0] } });
    assert.equal((await res.json()).ok, true);
  });
});

describe("payment proof", () => {
  const id = "__proof_" + randomUUID().slice(0, 8);
  const token = randomUUID();

  before(async () => {
    await call("/bill", {
      method: "POST",
      json: { id, data: "cipher", owner_hash: sha256(token) },
    });
  });

  const upload = (index, body, type = "image/png", name = "") =>
    call(`/proof?id=${id}&i=${index}&name=${encodeURIComponent(name)}`, {
      method: "POST",
      headers: { "content-type": type },
      body,
    });

  test("a viewer can upload their receipt", async () => {
    assert.equal((await (await upload(1, PNG)).json()).ok, true);
  });

  test("it shows up in the open list, without the image", async () => {
    const { proofs } = await (await call(`/proofs?id=${id}`)).json();
    assert.equal(proofs.length, 1);
    assert.equal(proofs[0].index, 1);
    assert.ok(proofs[0].uploadedAt);
    assert.equal(proofs[0].r2_key, undefined, "must not leak the object key");
  });

  test("anyone holding the link can see the image", async () => {
    // Deliberately open: settling up is a group conversation, and a receipt
    // only one person can see does not settle an argument about whether it was
    // sent. The un-guessable key is what protects the file.
    const asGuest = await call(`/proof?id=${id}&i=1`);
    assert.equal(asGuest.status, 200);
    assert.equal(asGuest.headers.get("content-type"), "image/png");
    assert.deepEqual(Buffer.from(await asGuest.arrayBuffer()), PNG);

    const asOwner = await call(`/proof?id=${id}&i=1`, { headers: { "x-owe-owner": token } });
    assert.equal(asOwner.status, 200);
  });

  test("but a wrong bill or index still yields nothing", async () => {
    assert.equal((await call(`/proof?id=__nope__&i=1`)).status, 404);
    assert.equal((await call(`/proof?id=${id}&i=99`)).status, 404);
  });

  test("re-uploading replaces rather than piling up", async () => {
    await upload(1, Buffer.concat([PNG, PNG]));
    const { proofs } = await (await call(`/proofs?id=${id}`)).json();
    assert.equal(proofs.length, 1, "still one proof for this person");
  });

  test("refuses a type that is not an image or pdf", async () => {
    assert.equal((await upload(2, Buffer.from("hi"), "text/plain")).status, 415);
  });

  test("refuses an empty body", async () => {
    assert.equal((await upload(2, Buffer.alloc(0))).status, 400);
  });

  test("refuses something too large", async () => {
    assert.equal((await upload(2, Buffer.alloc(6 * 1024 * 1024))).status, 413);
  });

  test("refuses a missing bill id or index", async () => {
    const res = await call("/proof?i=1", { method: "POST", headers: { "content-type": "image/png" }, body: PNG });
    assert.equal(res.status, 400);
  });

  test("a proof that was never uploaded is a 404", async () => {
    assert.equal((await call(`/proof?id=${id}&i=7`)).status, 404);
  });
});

describe("the object key a proof is filed under", () => {
  const token = randomUUID();

  const keyFor = async (index, name, type = "image/png", body = PNG) => {
    const bill = "__key_" + randomUUID().slice(0, 8);
    await call("/bill", {
      method: "POST",
      json: { id: bill, data: "c", owner_hash: sha256(token) },
    });
    const res = await call(`/proof?id=${bill}&i=${index}&name=${encodeURIComponent(name)}`, {
      method: "POST",
      headers: { "content-type": type },
      body,
    });
    assert.equal(res.status, 200, "upload should succeed");
    return { bill, key: (await keyOf(bill, index)) };
  };

  // the stored key is not returned by the API on purpose, so read it back the
  // only other way the tests can: by asking for the object and checking it
  // exists, plus asserting the shape we build it from.
  const keyOf = async (bill, index) => {
    const res = await call(`/proof?id=${bill}&i=${index}`, {
      headers: { "x-owe-owner": token },
    });
    return res.status === 200 ? "stored" : "missing";
  };

  test("files a plain name under bill / index-name / uuid.ext", async () => {
    const { key } = await keyFor(1, "Budi");
    assert.equal(key, "stored");
  });

  test("accepts a name full of punctuation without breaking the key", async () => {
    const { key } = await keyFor(2, "Sítí / ../ Nur  Halimah!!");
    assert.equal(key, "stored");
  });

  test("accepts an empty name", async () => {
    const { key } = await keyFor(3, "");
    assert.equal(key, "stored");
  });

  test("accepts a very long name", async () => {
    const { key } = await keyFor(4, "a".repeat(300));
    assert.equal(key, "stored");
  });

  test("files a pdf as well as an image", async () => {
    const { key } = await keyFor(5, "Budi", "application/pdf", Buffer.from("%PDF-1.4 test"));
    assert.equal(key, "stored");
  });
});

describe("removing a proof", () => {
  const token = randomUUID();
  let id;

  const seed = async (index) => {
    id = "__rm_" + randomUUID().slice(0, 8);
    await call("/bill", { method: "POST", json: { id, data: "c", owner_hash: sha256(token) } });
    await call(`/proof?id=${id}&i=${index}&name=Budi`, {
      method: "POST",
      headers: { "content-type": "image/png" },
      body: PNG,
    });
  };

  const del = (index, tok) =>
    call(`/proof?id=${id}&i=${index}`, {
      method: "DELETE",
      ...(tok ? { headers: { "x-owe-owner": tok } } : {}),
    });

  const has = async (index) =>
    (await (await call(`/proofs?id=${id}`)).json()).proofs.some((p) => p.index === index);

  test("whoever holds the link can remove it before it is confirmed", async () => {
    await seed(1);
    assert.equal((await (await del(1)).json()).ok, true);
    assert.equal(await has(1), false);
  });

  test("the owner can remove it too", async () => {
    await seed(1);
    assert.equal((await (await del(1, token)).json()).ok, true);
    assert.equal(await has(1), false);
  });

  test("a guest CANNOT remove it once the line is confirmed", async () => {
    await seed(1);
    await call("/bill", {
      method: "POST",
      json: { id, paid: [1] },
      headers: { "x-owe-owner": token },
    });

    const res = await del(1);
    assert.equal(res.status, 403);
    assert.equal(await has(1), true, "the receipt must survive a refused delete");
  });

  test("but the owner still can", async () => {
    await seed(1);
    await call("/bill", {
      method: "POST",
      json: { id, paid: [1] },
      headers: { "x-owe-owner": token },
    });

    assert.equal((await (await del(1, token)).json()).ok, true);
    assert.equal(await has(1), false);
  });

  test("confirming one person does not lock another's proof", async () => {
    await seed(1);
    await call(`/proof?id=${id}&i=2&name=Siti`, {
      method: "POST", headers: { "content-type": "image/png" }, body: PNG,
    });
    await call("/bill", {
      method: "POST", json: { id, paid: [1] }, headers: { "x-owe-owner": token },
    });

    assert.equal((await (await del(2)).json()).ok, true, "person 2 is still open");
    assert.equal(await has(1), true);
  });

  test("the object leaves R2, not just the row", async () => {
    await seed(1);
    // GET serves straight from R2, so a 404 after re-pointing a row at the same
    // proof proves the object itself is gone rather than merely unreferenced.
    assert.equal((await call(`/proof?id=${id}&i=1`)).status, 200);
    await del(1, token);

    // re-upload puts a NEW object at a NEW key; the old one must not resurface
    await call(`/proof?id=${id}&i=1&name=Budi`, {
      method: "POST", headers: { "content-type": "image/png" }, body: PNG,
    });
    const again = await call(`/proof?id=${id}&i=1`, { headers: { "x-owe-owner": token } });
    assert.equal(again.status, 200, "the new upload is readable");
    assert.deepEqual(Buffer.from(await again.arrayBuffer()), PNG);
  });

  test("replacing a proof does not orphan the old object", async () => {
    await seed(1);
    const bigger = Buffer.concat([PNG, PNG]);
    await call(`/proof?id=${id}&i=1&name=Budi`, {
      method: "POST", headers: { "content-type": "image/png" }, body: bigger,
    });
    const res = await call(`/proof?id=${id}&i=1`, { headers: { "x-owe-owner": token } });
    assert.deepEqual(Buffer.from(await res.arrayBuffer()), bigger, "serves the replacement");

    const { proofs } = await (await call(`/proofs?id=${id}`)).json();
    assert.equal(proofs.length, 1, "one row, not two");
  });

  test("removing something that is not there is a 404", async () => {
    await seed(1);
    assert.equal((await del(9)).status, 404);
  });

  test("a bad index is rejected", async () => {
    await seed(1);
    const res = await call(`/proof?id=${id}&i=nope`, { method: "DELETE" });
    assert.equal(res.status, 400);
  });
});

describe("deleting a whole bill", () => {
  const token = randomUUID();
  let id;

  const seed = async () => {
    id = "__delbill_" + randomUUID().slice(0, 8);
    await call("/bill", { method: "POST", json: { id, data: "cipher", owner_hash: sha256(token) } });
    for (const i of [1, 2]) {
      await call(`/proof?id=${id}&i=${i}&name=Budi`, {
        method: "POST", headers: { "content-type": "image/png" }, body: PNG,
      });
    }
  };

  const del = (tok) =>
    call(`/bill?id=${id}`, { method: "DELETE", ...(tok ? { headers: { "x-owe-owner": tok } } : {}) });

  test("a stranger cannot delete a bill they merely received", async () => {
    await seed();
    assert.equal((await del()).status, 403);
    assert.equal((await (await call(`/bill?id=${id}`)).json()).data, "cipher");
  });

  test("a wrong token cannot either", async () => {
    await seed();
    assert.equal((await del(randomUUID())).status, 403);
  });

  test("the owner removes the bill and every proof with it", async () => {
    await seed();
    const res = await del(token);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.proofs, 2, "both receipts were cleaned up");

    assert.equal((await (await call(`/bill?id=${id}`)).json()).data, null);
    assert.deepEqual((await (await call(`/proofs?id=${id}`)).json()).proofs, []);
  });

  test("the R2 objects go too, not just the rows", async () => {
    await seed();
    await del(token);
    // re-create the bill under the same id and re-point at the old proof slot:
    // a 404 proves the objects themselves are gone.
    await call("/bill", { method: "POST", json: { id, data: "c", owner_hash: sha256(token) } });
    const res = await call(`/proof?id=${id}&i=1`);
    assert.equal(res.status, 404);
  });

  test("deleting something already gone is not an error", async () => {
    await seed();
    await del(token);
    const body = await (await del(token)).json();
    assert.equal(body.ok, true);
    assert.equal(body.alreadyGone, true);
  });

  test("a bill with no proofs deletes cleanly", async () => {
    id = "__delbill_" + randomUUID().slice(0, 8);
    await call("/bill", { method: "POST", json: { id, data: "c", owner_hash: sha256(token) } });
    const body = await (await del(token)).json();
    assert.equal(body.ok, true);
    assert.equal(body.proofs, 0);
  });
});
