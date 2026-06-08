import { useEffect } from "react";

import { useStore } from "@/lib/store";

export function useAppliedAppearance(): void {
  const theme = useStore((s) => s.theme);
  const anim = useStore((s) => s.anim);
  const accent = useStore((s) => s.accent);

  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute("data-theme", theme);
    el.setAttribute("data-anim", anim ? "on" : "off");
    el.style.setProperty("--accent", accent);
  }, [theme, anim, accent]);
}
