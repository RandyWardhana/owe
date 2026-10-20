"use client";

import { useEffect, useRef, useState } from "react";

import { Gear } from "@/components/icons";
import { SettingsBody } from "@/components/Settings";
import { track } from "@/lib/analytics";

const DESKTOP = "(min-width: 760px)";

/* The landing's gear. On a desktop it opens a dropdown hanging from the gear,
   with a small pointer aimed at it; a bottom sheet rising from the foot of a
   wide screen read as a phone screen dropped onto a web page. On a phone the
   sheet is still the right thing, so there the gear hands off to it
   (`onOpenSheet`, rendered by Landing on its viewport-fixed layer). */
export default function SettingsMenu({
  label,
  onOpenSheet,
}: {
  label: string;
  onOpenSheet: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = window.matchMedia(DESKTOP);
    const decide = () => setDesktop(query.matches);
    decide();
    query.addEventListener("change", decide);
    return () => query.removeEventListener("change", decide);
  }, []);

  // A resize down to phone width closes the dropdown rather than leaving it
  // hanging over a layout it no longer belongs to.
  useEffect(() => {
    if (!desktop) setOpen(false);
  }, [desktop]);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className="lp-menu" ref={wrap}>
      <button
        type="button"
        className={`iconbtn lp-nav__gear ${open ? "is-on" : ""}`}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={desktop ? open : undefined}
        onClick={() => {
          if (!open) track("landing_settings_open", { kind: desktop ? "dropdown" : "sheet" });
          if (desktop) setOpen((o) => !o);
          else onOpenSheet();
        }}
      >
        <Gear size={19} />
      </button>

      {desktop && open ? (
        <div className="lp-menu__panel" role="dialog" aria-label={label}>
          <p className="lp-menu__title disp">{label}</p>
          <SettingsBody appearanceOnly />
        </div>
      ) : null}
    </div>
  );
}
