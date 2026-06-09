"use client";

import { useEffect, useState } from "react";

import { useT } from "@/lib/i18n";
import { WifiOff } from "@/components/icons";

/* Thin bar pinned to the very top (above the header) while the device is
   offline. Slides in and out, and flags <html data-offline> so the screen
   content shifts down (also animated) to make room. Accent background, dark
   on-accent text. */
export default function OfflineBar() {
  const t = useT();
  const [offline, setOffline] = useState(false);
  const [render, setRender] = useState(false); // stays mounted through exit
  const [shown, setShown] = useState(false); // slid-in state

  useEffect(() => {
    const update = () => {
      const off = !navigator.onLine;
      setOffline(off);
      document.documentElement.toggleAttribute("data-offline", off);
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      document.documentElement.removeAttribute("data-offline");
    };
  }, []);

  // drive the slide-in / slide-out
  useEffect(() => {
    if (offline) {
      setRender(true);
      const id = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(id);
    }
    setShown(false); // triggers slide-out
    // unmount on transition end, with a fallback for when motion is disabled
    const id = setTimeout(() => setRender(false), 320);
    return () => clearTimeout(id);
  }, [offline]);

  if (!render) return null;

  return (
    <div
      className={`offline-bar ${shown ? "is-shown" : ""}`}
      role="status"
      aria-live="polite"
      onTransitionEnd={() => {
        if (!shown) setRender(false);
      }}
    >
      <WifiOff size={15} />
      <span>{t("offline")}</span>
    </div>
  );
}
