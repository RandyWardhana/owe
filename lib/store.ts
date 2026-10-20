import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { remember } from "./addressBook";
import { HISTORY_LIMIT, mergeHistories } from "./historyMerge";
import type { Draft, Step } from "../entities/bill";
import type { AppState } from "../entities/settings";
import { uid, buzz } from "./util";

// Keeps a locked-in bill's history entry in step with live edits so "Done" never drops changes.
const syncSaved = (history: Draft[], draft: Draft): Draft[] =>
  history.some((entry) => entry.id === draft.id)
    ? history.map((entry) => (entry.id === draft.id ? draft : entry))
    : history;

export const emptyDraft = (): Draft => ({
  id: uid(),
  createdAt: Date.now(),
  title: "",
  items: [],
  people: [],
  charges: { taxPct: 0, servicePct: 0, discount: 0 },
  payerId: null,
  source: null,
  step: "home",
  paid: [],
});

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: "light",
      lang: "en",
      accent: "#9BE52E",
      currency: "IDR",
      rounding: "none",
      anim: true,
      viewCurrency: null,

      history: [],
      tombstones: {},
      draft: emptyDraft(),

      view: "home",
      stack: [],
      dir: "fwd",

      toast: null,

      setTheme: (theme) => set({ theme }),
      toggleTheme: () => {
        buzz(8);
        set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" }));
      },
      setLang: (lang) => set({ lang }),
      setAccent: (accent) => set({ accent }),
      setCurrency: (currency) => set({ currency }),
      setRounding: (rounding) => set({ rounding }),
      setAnim: (anim) => set({ anim }),
      setViewCurrency: (viewCurrency) => set({ viewCurrency }),

      patchDraft: (patch) =>
        set((s) => {
          const draft = { ...s.draft, ...patch, updatedAt: Date.now() };
          return { draft, history: syncSaved(s.history, draft) };
        }),
      updateDraft: (fn) =>
        set((s) => {
          const draft = { ...fn(s.draft), updatedAt: Date.now() };
          return { draft, history: syncSaved(s.history, draft) };
        }),

      go: (step) =>
        set((s) => ({
          dir: "fwd",
          stack: [...s.stack, s.view],
          view: step,
          draft: { ...s.draft, step },
        })),

      editStep: (step) =>
        set((s) => {
          const order: Step[] = ["review", "people", "assign", "breakdown"];
          const i = order.indexOf(step);
          return {
            dir: "back",
            view: step,
            draft: { ...s.draft, step },
            stack: i > 0 ? ["home", ...order.slice(0, i)] : ["home"],
          };
        }),

      back: () =>
        set((s) => {
          const stack = s.stack.slice(0, -1);
          return {
            dir: "back",
            stack,
            view: s.stack[s.stack.length - 1] || "home",
          };
        }),

      startNew: (step) =>
        set({
          dir: "fwd",
          draft: { ...emptyDraft(), step },
          stack: ["home"],
          view: step,
        }),

      resume: () =>
        set((s) => {
          const order: Step[] = ["review", "people", "assign", "breakdown"];
          const i = order.indexOf(s.draft.step);
          return {
            dir: "fwd",
            view: s.draft.step,
            stack: i > 0 ? ["home", ...order.slice(0, i)] : ["home"],
          };
        }),

      applyScan: (scan) => {
        const items = (scan.items || []).map((item) => ({
          id: uid(),
          name: item.name || "",
          qty: item.qty || 1,
          price: item.price || 0,
          assignedTo: [],
        }));
        const lang = get().lang;
        const fallbackTitle =
          scan.source === "manual"
            ? lang === "id"
              ? "Patungan baru"
              : "New split"
            : lang === "id"
              ? "Patungan hasil scan"
              : "Scanned split";
        set((s) => ({
          draft: {
            ...s.draft,
            items,
            charges: {
              taxPct: scan.charges?.taxPct || 0,
              servicePct: scan.charges?.servicePct || 0,
              discount: scan.charges?.discount || 0,
            },
            title: scan.merchant || fallbackTitle,
            source: scan.source,
            step: "review",
          },
          dir: "fwd",
          stack: ["home"],
          view: "review",
        }));
      },

      openHistory: (entry) =>
        set({
          draft: { ...entry, step: "breakdown" },
          dir: "fwd",
          // Seed the whole trail so Back can reach earlier steps; edits flow back via syncSaved.
          stack: ["home", "review", "people", "assign"],
          view: "breakdown",
        }),

      saveCurrent: (result, payerId) => {
        buzz(16);
        const { draft, currency } = get();
        remember(draft.people);
        const entry: Draft = {
          ...draft,
          payerId,
          createdAt: draft.createdAt || Date.now(),
          updatedAt: Date.now(),
          currency,
          summary: { grandTotal: result.grandTotal },
        };
        set((s) => {
          const without = s.history.filter((saved) => saved.id !== entry.id);
          return {
            history: [entry, ...without].slice(0, HISTORY_LIMIT),
            draft: entry,
          };
        });
        setTimeout(() => get().showToast("breakdown.saved"), 350);
      },

      deleteBillLocally: (id) =>
        set((s) => ({
          history: s.history.filter((entry) => entry.id !== id),
          tombstones: { ...s.tombstones, [id]: Date.now() },
          // Leaving it as the live draft would re-add it on the next edit via syncSaved.
          ...(s.draft.id === id
            ? { draft: emptyDraft(), view: "home" as const, stack: [], dir: "back" as const }
            : {}),
        })),

      discardDraft: () =>
        set({ draft: emptyDraft(), view: "home", stack: [], dir: "back" }),

      goHome: () => set({ view: "home", stack: [], dir: "back" }),

      mergeHistory: (incoming, incomingTombstones) =>
        set((s) =>
          mergeHistories(s.history, incoming, s.tombstones, incomingTombstones),
        ),

      finish: () =>
        set({ draft: emptyDraft(), dir: "back", stack: [], view: "home" }),

      showToast: (msg) => set({ toast: { id: uid(), msg } }),
      clearToast: () => set({ toast: null }),
    }),
    {
      name: "owe.v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        theme: s.theme,
        lang: s.lang,
        accent: s.accent,
        currency: s.currency,
        rounding: s.rounding,
        anim: s.anim,
        viewCurrency: s.viewCurrency,
        history: s.history,
        tombstones: s.tombstones,
        draft: s.draft,
      }),
    },
  ),
);
