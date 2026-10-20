"use client";

import { useEffect } from "react";

import { useStore } from "@/lib/store";
import { bucket, installErrorReporting, startAnalytics, track } from "@/lib/analytics";

const SETTINGS = ["theme", "lang", "accent", "currency", "rounding", "anim"] as const;

/* Firebase starts when the browser is idle: it is not needed for first paint.
   The store is watched only after persisted settings load, otherwise rehydration
   would be logged as the user changing theme and language on every visit. */
export default function AnalyticsBridge() {
  useEffect(() => {
    installErrorReporting();

    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(() => void startAnalytics(), { timeout: 4000 })
      : window.setTimeout(() => void startAnalytics(), 1500);

    const onInstalled = () => track("pwa_installed");
    window.addEventListener("appinstalled", onInstalled);

    let unsubscribe: (() => void) | undefined;
    const watch = () => {
      unsubscribe = useStore.subscribe((state, prev) => {
        if (state.view !== prev.view) {
          track("screen_view", { screen_name: state.view });
        }

        // applyScan builds a new item list and lands on Review: a bill has
        // started, by scan, by hand, or from the sample.
        if (state.view === "review" && prev.view !== "review" && state.draft.items !== prev.draft.items && state.draft.source) {
          track("bill_started", { source: state.draft.source, items: bucket(state.draft.items.length) });
        }

        // saveCurrent puts the open bill first in history with a fresh
        // updatedAt. A sync from another device (mergeHistory) changes history
        // too, but never for the bill that is open right now.
        const top = state.history[0];
        if (state.history !== prev.history && top && top.id === state.draft.id && top.updatedAt !== prev.history[0]?.updatedAt) {
          const existed = prev.history.some((entry) => entry.id === top.id);
          track("bill_locked", {
            first_time: !existed,
            items: bucket(top.items.length),
            people: bucket(top.people.length),
          });
        }

        if (state.history.length < prev.history.length && Object.keys(state.tombstones).length > Object.keys(prev.tombstones).length) {
          track("bill_deleted");
        }

        for (const key of SETTINGS) {
          if (state[key] !== prev[key]) track("settings_change", { setting: key, value: String(state[key]) });
        }
      });
    };

    if (useStore.persist.hasHydrated()) watch();
    const stopHydration = useStore.persist.onFinishHydration(() => {
      if (!unsubscribe) watch();
    });

    return () => {
      if (window.cancelIdleCallback && typeof idle === "number") window.cancelIdleCallback(idle);
      window.clearTimeout(idle as number);
      window.removeEventListener("appinstalled", onInstalled);
      stopHydration();
      unsubscribe?.();
    };
  }, []);

  return null;
}
