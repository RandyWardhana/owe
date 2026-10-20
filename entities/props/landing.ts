import type { ReactNode } from "react";

export interface MoneyProps {
  value: number;
  className?: string;
  duration?: number;
}

export interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "li";
}

export interface SettingsMenuProps {
  label: string;
  onOpenSheet: () => void;
}

// Mirrors Item (assignedTo / units / countEach) so the demo divides a line exactly as the app does.
export interface TrySplitLine {
  who: number[];
  units: number[];
  each: boolean;
}

export interface PresetItem {
  name: string;
  // The whole line, as printed on the receipt.
  price: number;
  qty?: number;
  // Indexes into PEOPLE.
  start: number[];
  // Per-person counts in `start` order; absent means shared equally.
  counts?: number[];
}

export interface Preset {
  id: "ramen" | "lunch" | "drinks";
  place: string;
  tax: number;
  service: number;
  items: PresetItem[];
}

export interface LandingCopy {
  nav: { how: string; try: string; faq: string; open: string };
  hero: {
    badges: string[];
    title: string[];
    lead: string;
    primary: string;
    secondary: string;
    activity: { title: string; meta: string }[];
    chips: string[];
    stat: { eyebrow: string; value: string; sub: string };
    rail: string;
  };
  how: {
    eyebrow: string;
    title: string;
    step: string;
    steps: { num: string; title: string; desc: string; line: string }[];
  };
  presets: Record<Preset["id"], string>;
  try: {
    eyebrow: string;
    title: string;
    lead: string;
    presetsLabel: string;
    cta: string;
    tapFace: string;
    allTheirs: string;
    nobodyYet: string;
    shareAll: string;
    clear: string;
    of: string;
    assigned: string;
    subtotal: string;
    total: string;
    tax: string;
    service: string;
    covered: string;
    orphansOne: string;
    orphansMany: string;
    add: string;
    remove: string;
  };
  perks: {
    eyebrow: string;
    title: string;
    lead: string;
    stats: { value: string; label: string }[];
    items: { title: string; desc: string }[];
  };
  banner: { title: string; lead: string; button: string; phoneTitle: string; copy: string };
  faqHead: { eyebrow: string; title: string };
  faqs: { q: string; a: string }[];
  final: { title: string[]; lead: string; button: string; install: string };
  footer: { tag: string; fine: string };
}

export interface PayBrand {
  name: string;
  src: string;
}
