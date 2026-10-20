import { useEffect } from "react";

import { useStore } from "../store";
import { applyAccentFavicon } from "../favicon";
import { ACCENT_COOKIE, knownAccent } from "../accents";

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

  useEffect(() => {
    void applyAccentFavicon(accent);

    // The manifest request carries cookies, not localStorage, so the server needs a cookie to
    // tint the installed icon. Only known accents are written.
    const known = knownAccent(accent);
    if (known) {
      document.cookie = `${ACCENT_COOKIE}=${known.slice(1)}; path=/; max-age=31536000; samesite=lax`;
    }
  }, [accent]);
}
