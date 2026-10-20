"use client";

import { createContext, useContext } from "react";

import type { Lang } from "@/entities/settings";

import { COPY } from "./data";
import type { LandingCopy } from "@/entities/props/landing";

/* "en" until mounted, then the store's saved language: the store rehydrates from
   localStorage on the first client render, which would disagree with the server
   HTML, and a marketing page cannot render nothing until mounted as the app does. */
const LangContext = createContext<Lang>("en");

export const LandingLangProvider = LangContext.Provider;

export function useLandingLang(): Lang {
  return useContext(LangContext);
}

export function useCopy(): LandingCopy {
  return COPY[useContext(LangContext)];
}

export function fill(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, key) => (key in vars ? String(vars[key]) : `{${key}}`));
}
