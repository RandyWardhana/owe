import { useStore } from "@/lib/store";
import type { Lang } from "@/lib/types";
import en from "./en";
import idDict from "./id";

export const LANGS: { value: Lang; label: string }[] = [
  { value: "en", label: "English" },
  { value: "id", label: "Bahasa Indonesia" },
];

const DICTS: Record<Lang, typeof en> = { en, id: idDict };

type Vars = Record<string, string | number>;

function resolve(lang: Lang, key: string): string {
  const dict = DICTS[lang] || en;
  const fromEn = key.split(".").reduce<unknown>((o, k) => {
    if (o && typeof o === "object" && k in (o as Record<string, unknown>))
      return (o as Record<string, unknown>)[k];
    return undefined;
  }, dict);
  if (typeof fromEn === "string") return fromEn;

  const fb = key.split(".").reduce<unknown>((o, k) => {
    if (o && typeof o === "object" && k in (o as Record<string, unknown>))
      return (o as Record<string, unknown>)[k];
    return undefined;
  }, en);
  return typeof fb === "string" ? fb : key;
}

function interpolate(str: string, vars?: Vars): string {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  );
}

export function translate(lang: Lang, key: string, vars?: Vars): string {
  return interpolate(resolve(lang, key), vars);
}

export type TFn = (key: string, vars?: Vars) => string;

export function useT(): TFn {
  const lang = useStore((s) => s.lang);
  return (key: string, vars?: Vars) => translate(lang, key, vars);
}
