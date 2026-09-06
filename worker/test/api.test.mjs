/* Round-trips the owe-db Worker. Zero dependencies: node:test + fetch.
   Point it at whichever instance you want to check —

     local:    npx wrangler dev --local        (another terminal)
               OWE_DB_URL=http://127.0.0.1:8787 OWE_DB_SECRET=local-test-secret npm test

     deployed: reads OWE_DB_URL / OWE_DB_SECRET straight from ../.env.local

   Rows are written under a fixed key, so repeated runs overwrite rather than
   litter the database. */
import { test, before, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { assertNotProduction } from "./guard.mjs";

const here = dirname(fileURLToPath(import.meta.url));

function env(name) {
  if (process.env[name]) return process.env[name];
  try {
    const file = readFileSync(join(here, "..", "..", ".env.local"), "utf8");
    const line = file.split("\n").find((l) => l.startsWith(name + "="));
    return line ? line.slice(name.length + 1).trim() : "";
  } catch {
    return "";
  }
}

const BASE = env("OWE_DB_URL").replace(/\/+$/, "");
const SECRET = env("OWE_DB_SECRET");
const KEY = "__owe_selftest__";

const call = (path, init = {}) =>
  fetch(BASE + path, {
    ...init,
    headers: {
      "x-owe-secret": SECRET,
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });

const post = (path, body) =>
  call(path, { method: "POST", body: JSON.stringify(body) });

before(() => {
  assert.ok(BASE, "OWE_DB_URL is not set (env or .env.local)");
  assert.ok(SECRET, "OWE_DB_SECRET is not set (env or .env.local)");
  assertNotProduction(BASE);
});

describe("auth", () => {
  test("refuses a request with no secret", async () => {
    const res = await fetch(`${BASE}/bill?id=${KEY}`);
    assert.equal(res.status, 401);
  });

  test("refuses a wrong secret", async () => {
    const res = await call(`/bill?id=${KEY}`, {
      headers: { "x-owe-secret": "definitely-not-it" },
    });
    assert.equal(res.status, 401);
  });

  test("accepts the configured secret", async () => {
    const res = await call(`/bill?id=${KEY}`);
    assert.equal(res.status, 200);
  });

  test("404s an unknown path", async () => {
    assert.equal((await call("/nope")).status, 404);
  });
});

describe("bills", () => {
  test("an unknown bill reads as empty, not an error", async () => {
    const res = await call("/bill?id=__owe_does_not_exist__");
    assert.deepEqual(await res.json(), { data: null, paid: [] });
  });

  test("stores the encrypted bill and reads it back", async () => {
    await post("/bill", { id: KEY, data: "cipher-1", paid: [] });
    const body = await (await call(`/bill?id=${KEY}`)).json();
    assert.equal(body.data, "cipher-1");
    assert.deepEqual(body.paid, []);
  });

  test("settling up does NOT wipe the bill", async () => {
    await post("/bill", { id: KEY, paid: [0, 2] });
    const body = await (await call(`/bill?id=${KEY}`)).json();
    assert.equal(body.data, "cipher-1", "data survived a paid-only write");
    assert.deepEqual(body.paid, [0, 2]);
  });

  test("re-sharing does NOT reset who has paid", async () => {
    await post("/bill", { id: KEY, data: "cipher-2" });
    const body = await (await call(`/bill?id=${KEY}`)).json();
    assert.equal(body.data, "cipher-2");
    assert.deepEqual(body.paid, [0, 2], "paid survived a data-only write");
  });

  test("paid can be cleared back to empty", async () => {
    await post("/bill", { id: KEY, paid: [] });
    const body = await (await call(`/bill?id=${KEY}`)).json();
    assert.deepEqual(body.paid, []);
  });

  test("rejects a write with no id", async () => {
    assert.equal((await post("/bill", { data: "x" })).status, 400);
  });
});

describe("device history", () => {
  test("an unknown key reads as empty", async () => {
    const res = await call("/sync?key=__owe_does_not_exist__");
    assert.deepEqual(await res.json(), { data: null });
  });

  test("stores and overwrites the history blob", async () => {
    await post("/sync", { key: KEY, data: "hist-1" });
    assert.equal((await (await call(`/sync?key=${KEY}`)).json()).data, "hist-1");

    await post("/sync", { key: KEY, data: "hist-2" });
    assert.equal((await (await call(`/sync?key=${KEY}`)).json()).data, "hist-2");
  });

  test("rejects a write with no data", async () => {
    assert.equal((await post("/sync", { key: KEY })).status, 400);
  });
});
