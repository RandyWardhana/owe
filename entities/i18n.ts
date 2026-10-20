import type en from "../lib/i18n/en";

export type Dict = typeof en;

export type TranslationVars = Record<string, string | number>;

export type TFn = (key: string, vars?: TranslationVars) => string;
