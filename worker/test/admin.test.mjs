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

  test("a backup's bill index can be filled without touching its blob or sync time", async () => {
    const key = sha256("a-sync-code");
    const before = (await (await call("/admin/backups")).json()).backups.find((b) => b.key === key);
    const res = await (await call(`/admin/backup-bills?key=${key}`, { method: "POST", json: { bills: [id, id] } })).json();
    assert.equal(res.changed, 1);
    const after = (await (await call("/admin/backups")).json()).backups.find((b) => b.key === key);
    assert.deepEqual(JSON.parse(after.bill_ids), [id]);
    assert.equal(after.updated_at, before.updated_at);
    assert.equal((await (await call(`/admin/backup?key=${key}`)).json()).backup.data, "blob");
  });

  test("an unknown key yields nothing rather than an error", async () => {
    const { backup } = await (await call(`/admin/backup?key=${sha256("nope")}`)).json();
    assert.equal(backup, null);
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

describe("bills carry their owner's sync key", () => {
  const token = randomUUID();
  const mine = sha256("owner-sync-code");
  const theirs = sha256("guest-sync-code");
  const syncKeyOf = async (id) => (await (await call(`/admin/bill?id=${id}`)).json()).bill.sync_key;
  let id;

  before(async () => {
    id = "__sync_" + randomUUID().slice(0, 8);
  });

  test("the share that creates a bill stamps it", async () => {
    await call("/bill", { method: "POST", json: { id, data: "cipher", owner_hash: sha256(token), sync_key: mine } });
    assert.equal(await syncKeyOf(id), mine);
    const { bills } = await (await call("/admin/bills")).json();
    assert.equal(bills.find((b) => b.id === id).sync_key, mine);
  });

  test("a write without the owner token cannot move it", async () => {
    await call("/bill", { method: "POST", json: { id, data: "cipher2", sync_key: theirs } });
    assert.equal(await syncKeyOf(id), mine);
  });

  test("an owner write moves it to the code the owner now uses", async () => {
    const next = sha256("owner-new-code");
    await call("/bill", {
      method: "POST", headers: { "x-owe-owner": token }, json: { id, paid: [0], sync_key: next },
    });
    assert.equal(await syncKeyOf(id), next);
  });

  test("a sync links the bills it proves it owns, and only those", async () => {
    await call("/sync", { method: "POST", json: { key: theirs, data: "blob", owned: { [id]: "wrong-token" } } });
    assert.notEqual(await syncKeyOf(id), theirs);
    await call("/sync", { method: "POST", json: { key: mine, data: "blob", owned: { [id]: token } } });
    assert.equal(await syncKeyOf(id), mine);
  });

  test("giving ownership away moves the sync key with it", async () => {
    const res = await (await call(`/admin/owner?id=${id}`, {
      method: "POST", json: { owner_hash: sha256("new-owner"), sync_key: theirs },
    })).json();
    assert.equal(res.changed, 1);
    assert.equal(await syncKeyOf(id), theirs);
  });
});

describe("admin deletes a bill", () => {
  let id;

  before(async () => {
    id = "__adel_" + randomUUID().slice(0, 8);
    await call("/bill", { method: "POST", json: { id, data: "cipher", owner_hash: sha256(randomUUID()) } });
    await call(`/proof?id=${id}&i=1&name=Budi`, { method: "POST", headers: { "content-type": "image/png" }, body: PNG });
    await call(`/proof?id=${id}&i=2&name=Sari`, { method: "POST", headers: { "content-type": "image/png" }, body: PNG });
  });

  test("removes the row, the proofs and every stored file, without the owner token", async () => {
    const res = await (await call(`/admin/bill?id=${id}`, { method: "DELETE" })).json();
    assert.equal(res.ok, true);
    assert.equal(res.proofs, 2);
    assert.equal(res.files, 2);
    assert.equal((await (await call(`/bill?id=${id}`)).json()).data ?? null, null);
    assert.equal((await (await call(`/admin/objects?prefix=${id}`)).json()).objects.length, 0);
    assert.equal((await (await call("/admin/bills")).json()).bills.some((b) => b.id === id), false);
  });

  test("deleting it again is not an error", async () => {
    const res = await (await call(`/admin/bill?id=${id}`, { method: "DELETE" })).json();
    assert.equal(res.ok, true);
    assert.equal(res.alreadyGone, true);
  });
});

describe("a backup carries the name its user typed", () => {
  const key = sha256("named-sync-code");
  const nameOf = async () =>
    (await (await call("/admin/backups")).json()).backups.find((b) => b.key === key)?.name ?? null;

  test("a sync with a name labels the backup", async () => {
    await call("/sync", { method: "POST", json: { key, data: "blob", name: "  Randy  " } });
    assert.equal(await nameOf(), "Randy");
  });

  test("a sync from an older app, with no name field, keeps it", async () => {
    await call("/sync", { method: "POST", json: { key, data: "blob2" } });
    assert.equal(await nameOf(), "Randy");
  });

  test("an empty name clears it, and a long one is cut to 40", async () => {
    await call("/sync", { method: "POST", json: { key, data: "blob3", name: "" } });
    assert.equal(await nameOf(), null);
    await call("/sync", { method: "POST", json: { key, data: "blob4", name: "x".repeat(60) } });
    assert.equal((await nameOf()).length, 40);
  });
});

describe("admin deletes a backup", () => {
  const key = sha256("throwaway-sync-code");

  test("removes only that backup", async () => {
    await call("/sync", { method: "POST", json: { key, data: "blob" } });
    const res = await (await call(`/admin/backup?key=${key}`, { method: "DELETE" })).json();
    assert.equal(res.changed, 1);
    assert.equal((await (await call(`/admin/backup?key=${key}`)).json()).backup, null);
    assert.ok((await (await call("/admin/backups")).json()).backups.some((b) => b.key === sha256("a-sync-code")));
  });

  test("the phone's next sync brings it back", async () => {
    await call("/sync", { method: "POST", json: { key, data: "blob2" } });
    assert.equal((await (await call(`/admin/backup?key=${key}`)).json()).backup.data, "blob2");
  });
});
