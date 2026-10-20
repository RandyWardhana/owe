"use client";

import { useEffect } from "react";

import { useStore } from "@/lib/store";
import { bucket, installErrorReporting, startAnalytics, track } from "@/lib/analytics";

const SETTINGS = ["theme", "lang", "accent", "currency", "rounding", "anim"] as const;

/* Mounted once, in the root layout, so the app, shared links and /landing all
   report. Firebase is started when the browser is idle rather than on mount:
   it is not needed for the first paint, and a launch on a slow phone should
   spend its first second drawing the screen.

   Most app events come from watching the store instead of being sprinkled
   through the screens, because every step already goes through it. It only
   starts watching after the persisted settings have loaded -- otherwise the
   rehydration itself, setting theme and language from storage, would be
   logged as the user changing them on every visit. */
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
      unsubscribe = useStore.subscribe((s, prev) => {
        if (s.view !== prev.view) {
          track("screen_view", { screen_name: s.view });
        }

        // applyScan builds a new item list and lands on Review: a bill has
        // started, by scan, by hand, or from the sample.
        if (s.view === "review" && prev.view !== "review" && s.draft.items !== prev.draft.items && s.draft.source) {
          track("bill_started", { source: s.draft.source, items: bucket(s.draft.items.length) });
        }

        // saveCurrent puts the open bill first in history with a fresh
        // updatedAt. A sync from another device (mergeHistory) changes history
        // too, but never for the bill that is open right now.
        const top = s.history[0];
        if (s.history !== prev.history && top && top.id === s.draft.id && top.updatedAt !== prev.history[0]?.updatedAt) {
          const existed = prev.history.some((h) => h.id === top.id);
          track("bill_locked", {
            first_time: !existed,
            items: bucket(top.items.length),
            people: bucket(top.people.length),
          });
        }

        if (s.history.length < prev.history.length && Object.keys(s.tombstones).length > Object.keys(prev.tombstones).length) {
          track("bill_deleted");
        }

        for (const key of SETTINGS) {
          if (s[key] !== prev[key]) track("settings_change", { setting: key, value: String(s[key]) });
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
