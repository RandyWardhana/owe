import { useEffect } from "react";

import { useStore } from "@/lib/store";

export function useAppliedAppearance(): void {
  const theme = useStore((s) => s.theme);
  const anim = useStore((s) => s.anim);
  const accent = useStore((s) => s.accent);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-anim", anim ? "on" : "off");
    root.style.setProperty("--accent", accent);
  }, [theme, anim, accent]);
}
