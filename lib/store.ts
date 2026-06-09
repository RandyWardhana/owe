import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  Draft,
  Lang,
  Rounding,
  ScanResult,
  SplitResult,
  Step,
  Theme,
} from "./types";
import { uid, buzz } from "./util";

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

// Once a bill is locked in, keep its history entry in sync with live edits
// (payer / paid) so "Done" never drops changes.
const syncSaved = (history: Draft[], draft: Draft): Draft[] =>
  history.some((h) => h.id === draft.id)
    ? history.map((h) => (h.id === draft.id ? draft : h))
    : history;

export interface Toast {
  id: string;
  msg: string;
}

interface State {
  theme: Theme;
  lang: Lang;
  accent: string;
  currency: string;
  rounding: Rounding;
  anim: boolean;

  history: Draft[];
  draft: Draft;

  view: Step;
  stack: Step[];
  dir: "fwd" | "back";

  toast: Toast | null;

  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setLang: (l: Lang) => void;
  setAccent: (a: string) => void;
  setCurrency: (c: string) => void;
  setRounding: (r: Rounding) => void;
  setAnim: (v: boolean) => void;

  patchDraft: (patch: Partial<Draft>) => void;
  updateDraft: (fn: (d: Draft) => Draft) => void;

  go: (step: Step) => void;
  back: () => void;
  startNew: (step: Step) => void;
  resume: () => void;
  applyScan: (res: ScanResult) => void;
  openHistory: (h: Draft) => void;
  saveCurrent: (result: SplitResult, payerId: string | null) => void;
  finish: () => void;

  showToast: (msg: string) => void;
  clearToast: () => void;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      theme: "light",
      lang: "en",
      accent: "#9BE52E",
      currency: "IDR",
      rounding: "none",
      anim: true,

      history: [],
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

      patchDraft: (patch) =>
        set((s) => {
          const draft = { ...s.draft, ...patch };
          return { draft, history: syncSaved(s.history, draft) };
        }),
      updateDraft: (fn) =>
        set((s) => {
          const draft = fn(s.draft);
          return { draft, history: syncSaved(s.history, draft) };
        }),

      go: (step) =>
        set((s) => ({
          dir: "fwd",
          stack: [...s.stack, s.view],
          view: step,
          draft: { ...s.draft, step },
        })),

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

      applyScan: (res) => {
        const items = (res.items || []).map((i) => ({
          id: uid(),
          name: i.name || "",
          qty: i.qty || 1,
          price: i.price || 0,
          assignedTo: [],
        }));
        const lang = get().lang;
        const fallbackTitle =
          res.source === "manual"
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
              taxPct: res.charges?.taxPct || 0,
              servicePct: res.charges?.servicePct || 0,
              discount: res.charges?.discount || 0,
            },
            title: res.merchant || fallbackTitle,
            source: res.source,
            step: "review",
          },
          dir: "fwd",
          stack: ["home"],
          view: "review",
        }));
      },

      openHistory: (h) =>
        set({
          draft: { ...h, step: "breakdown" },
          dir: "fwd",
          stack: ["home"],
          view: "breakdown",
        }),

      saveCurrent: (result, payerId) => {
        buzz(16);
        const { draft, currency } = get();
        const entry: Draft = {
          ...draft,
          payerId,
          createdAt: draft.createdAt || Date.now(),
          currency,
          summary: { grandTotal: result.grandTotal },
        };
        set((s) => {
          const without = s.history.filter((x) => x.id !== entry.id);
          return {
            history: [entry, ...without].slice(0, 30),
            draft: entry,
          };
        });
        setTimeout(() => get().showToast("breakdown.saved"), 350);
      },

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
        history: s.history,
        draft: s.draft,
      }),
    },
  ),
);
