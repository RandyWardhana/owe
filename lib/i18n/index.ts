import { useStore } from "../store";
import type { TFn, TranslationVars } from "../../entities/i18n";
import type { Lang } from "../../entities/settings";
import en from "./en";
import idDict from "./id";

export const LANGS: { value: Lang; label: string }[] = [
  { value: "en", label: "English" },
  { value: "id", label: "Bahasa Indonesia" },
];

const DICTS: Record<Lang, typeof en> = { en, id: idDict };

function resolve(lang: Lang, key: string): string {
  const dict = DICTS[lang] || en;
  const lookup = (root: typeof en): unknown =>
    key.split(".").reduce<unknown>((node, segment) => {
      if (node && typeof node === "object" && segment in (node as Record<string, unknown>))
        return (node as Record<string, unknown>)[segment];
      return undefined;
    }, root);

  const fromDict = lookup(dict);
  if (typeof fromDict === "string") return fromDict;

  const fromFallback = lookup(en);
  return typeof fromFallback === "string" ? fromFallback : key;
}

function interpolate(str: string, vars?: TranslationVars): string {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, name) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}

export function translate(lang: Lang, key: string, vars?: TranslationVars): string {
  return interpolate(resolve(lang, key), vars);
}

export function useT(): TFn {
  const lang = useStore((s) => s.lang);
  return (key: string, vars?: TranslationVars) => translate(lang, key, vars);
}
