"use client";

import { createContext, useContext } from "react";

import type { Lang } from "@/lib/types";

import { COPY, type LandingCopy } from "./data";

/* The landing's language, decided once in Landing and read everywhere else.

   It is "en" until the page has mounted, then the language saved in the app's
   store. The store rehydrates from localStorage on the client's first render,
   so reading it directly would make that render disagree with the server's
   HTML; the app avoids this by rendering nothing until mounted, which a
   marketing page cannot do without losing its server-rendered text. */
const LangContext = createContext<Lang>("en");

export const LandingLangProvider = LangContext.Provider;

export function useLandingLang(): Lang {
  return useContext(LangContext);
}

export function useCopy(): LandingCopy {
  return COPY[useContext(LangContext)];
}

/** "{n} items" -> "3 items". Same placeholder style as lib/i18n. */
export function fill(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, key) => (key in vars ? String(vars[key]) : `{${key}}`));
}
