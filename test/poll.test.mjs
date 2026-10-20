import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

let state = { visibility: "visible", onLine: true, docListeners: {}, winListeners: {} };

globalThis.document = {
  get visibilityState() {
    return state.visibility;
  },
  addEventListener: (type, fn) => ((state.docListeners[type] ??= []).push(fn)),
  removeEventListener: (type, fn) => {
    state.docListeners[type] = (state.docListeners[type] ?? []).filter((f) => f !== fn);
  },
};
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  get: () => ({ onLine: state.onLine }),
});
globalThis.window = {
  addEventListener: (type, fn) => ((state.winListeners[type] ??= []).push(fn)),
  removeEventListener: (type, fn) => {
    state.winListeners[type] = (state.winListeners[type] ?? []).filter((f) => f !== fn);
  },
};

const fire = (bag, type) => (state[bag][type] ?? []).forEach((fn) => fn());

const { pollWhileVisible } = await import("../.test-build/poll.js");

describe("polling a shared bill", () => {
  beforeEach(() => {
    state.visibility = "visible";
    state.onLine = true;
    state.docListeners = {};
    state.winListeners = {};
  });

  test("runs once straight away, not only after the first interval", () => {
    let calls = 0;
    const stop = pollWhileVisible(() => calls++, 10_000);
    assert.equal(calls, 1);
    stop();
  });

  test("keeps going on the interval", async () => {
    let calls = 0;
    const stop = pollWhileVisible(() => calls++, 20);
    await new Promise((r) => setTimeout(r, 70));
    stop();
    assert.ok(calls >= 3, `expected repeats, got ${calls}`);
  });

  test("does nothing while the tab is hidden", async () => {
    state.visibility = "hidden";
    let calls = 0;
    const stop = pollWhileVisible(() => calls++, 20);
    await new Promise((r) => setTimeout(r, 70));
    stop();
    assert.equal(calls, 0, "a phone in a pocket must not be fetching");
  });

  test("does nothing while offline", async () => {
    state.onLine = false;
    let calls = 0;
    const stop = pollWhileVisible(() => calls++, 20);
    await new Promise((r) => setTimeout(r, 50));
    stop();
    assert.equal(calls, 0);
  });

  test("catches up the moment the tab comes back", () => {
    state.visibility = "hidden";
    let calls = 0;
    const stop = pollWhileVisible(() => calls++, 10_000);
    assert.equal(calls, 0);

    // Coming back to the screen is exactly when the answer matters, so waiting
    // out the rest of the interval would be the one delay anyone notices.
    state.visibility = "visible";
    fire("docListeners", "visibilitychange");
    assert.equal(calls, 1);
    stop();
  });

  test("catches up when the connection returns", () => {
    state.onLine = false;
    let calls = 0;
    const stop = pollWhileVisible(() => calls++, 10_000);
    state.onLine = true;
    fire("winListeners", "online");
    assert.equal(calls, 1);
    stop();
  });

  test("stopping detaches everything, so a closed screen goes quiet", async () => {
    let calls = 0;
    const stop = pollWhileVisible(() => calls++, 20);
    stop();
    const after = calls;

    await new Promise((r) => setTimeout(r, 60));
    fire("docListeners", "visibilitychange");
    fire("winListeners", "online");

    assert.equal(calls, after, "a stopped poller must not fire again");
    assert.equal((state.docListeners.visibilitychange ?? []).length, 0);
    assert.equal((state.winListeners.online ?? []).length, 0);
  });
});
