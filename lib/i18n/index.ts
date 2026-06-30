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

function interpolate(str: string, vars?: Vars): string {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, name) =>
    name in vars ? String(vars[name]) : `{${name}}`,
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
