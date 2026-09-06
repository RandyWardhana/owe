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
    headers: { "x-owe-secret": SECRET, ...(init.json ? { "content-type": "application/json" } : {}), ...init.headers },
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

describe("admin", () => {
  const token = randomUUID();
  let id;

  before(async () => {
    id = "__admin_" + randomUUID().slice(0, 8);
    await call("/bill", { method: "POST", json: { id, data: "cipher", owner_hash: sha256(token) } });
    await call(`/proof?id=${id}&i=1&name=Budi`, {
      method: "POST", headers: { "content-type": "image/png" }, body: PNG,
    });
    await call("/sync", { method: "POST", json: { key: sha256("a-sync-code"), data: "blob" } });
  });

  test("lists bills with their paid state, proof count and ownership", async () => {
    const { bills } = await (await call("/admin/bills")).json();
    const mine = bills.find((b) => b.id === id);
    assert.ok(mine, "the bill is listed");
    assert.equal(mine.owned, 1);
    assert.equal(mine.proofs, 1);
    assert.equal(mine.data, "cipher");
  });

  test("lists backups by hash and size, never their contents", async () => {
    const { backups } = await (await call("/admin/backups")).json();
    const row = backups.find((b) => b.key === sha256("a-sync-code"));
    assert.ok(row);
    assert.equal(row.size, 4);
    assert.equal(row.data, undefined, "the listing must not carry the blob");
  });

  test("a backup can be fetched when you already hold its key", async () => {
    const { backup } = await (await call(`/admin/backup?key=${sha256("a-sync-code")}`)).json();
    assert.equal(backup.data, "blob");
  });

  test("an unknown key yields nothing rather than an error", async () => {
    const { backup } = await (await call(`/admin/backup?key=${sha256("nope")}`)).json();
    assert.equal(backup, null);
  });

  test("releasing ownership lets a stranger change paid again", async () => {
    assert.equal((await call("/bill", { method: "POST", json: { id, paid: [1] } })).status, 403);

    const res = await (await call(`/admin/release?id=${id}`, { method: "POST" })).json();
    assert.equal(res.ok, true);
    assert.equal(res.changed, 1);

    assert.equal((await (await call("/bill", { method: "POST", json: { id, paid: [1] } })).json()).ok, true);
    assert.deepEqual((await (await call(`/bill?id=${id}`)).json()).paid, [1]);
  });

  test("releasing a bill that does not exist changes nothing", async () => {
    const res = await (await call("/admin/release?id=__nope__", { method: "POST" })).json();
    assert.equal(res.changed, 0);
  });

  test("lists stored objects and flags the ones nothing references", async () => {
    const { objects } = await (await call(`/admin/objects?prefix=${id}`)).json();
    assert.equal(objects.length, 1);
    assert.equal(objects[0].orphan, false, "this one is referenced by a proofs row");

    // an object with no row behind it is exactly what needs finding
    await call(`/proof?id=${id}&i=1&name=Budi`, {
      method: "POST", headers: { "content-type": "image/png" }, body: PNG,
    });
    const after = await (await call(`/admin/objects?prefix=${id}`)).json();
    assert.equal(after.objects.length, 1, "replacing deletes the superseded object");
  });

  test("an object can be deleted outright", async () => {
    const { objects } = await (await call(`/admin/objects?prefix=${id}`)).json();
    const key = objects[0].key;
    assert.equal((await (await call(`/admin/object?key=${encodeURIComponent(key)}`, { method: "DELETE" })).json()).ok, true);
    const after = await (await call(`/admin/objects?prefix=${id}`)).json();
    assert.equal(after.objects.length, 0);
  });

  test("an unknown admin path is a 404, not a surprise", async () => {
    assert.equal((await call("/admin/whatever")).status, 404);
  });
});
