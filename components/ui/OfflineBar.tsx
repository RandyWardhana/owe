"use client";

import { useEffect, useRef, useState } from "react";

import { useT } from "@/lib/i18n";
import { Wifi, WifiOff } from "@/components/icons";

/* Thin bar pinned to the very top (above the header) while the device is
   offline. Slides in and out, and flags <html data-offline> so the screen
   content shifts down (also animated) to make room. When the connection
   comes back it briefly switches to a "back online" confirmation, then slides
   away. Accent background offline, positive background when back online. */
export default function OfflineBar() {
  const t = useT();
  const [mode, setMode] = useState<"offline" | "online" | null>(null);
  const [render, setRender] = useState(false); // stays mounted through exit
  const [shown, setShown] = useState(false); // slid-in state
  const wasOffline = useRef(false);

  useEffect(() => {
    const update = () => {
      if (!navigator.onLine) {
        wasOffline.current = true;
        setMode("offline");
      } else if (wasOffline.current) {
        wasOffline.current = false;
        setMode("online");
      }
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

  // keep the content offset in sync with the bar's visibility
  useEffect(() => {
    document.documentElement.toggleAttribute("data-offline", shown);
  }, [shown]);

  // fallback unmount for when the slide-out transition won't fire (motion off)
  useEffect(() => {
    if (shown || !render) return;
    const id = setTimeout(() => {
      setRender(false);
      setMode(null);
    }, 360);
    return () => clearTimeout(id);
  }, [shown, render]);

  // drive slide-in → (hold, if back online) → slide-out
  useEffect(() => {
    if (mode === "offline") {
      setRender(true);
      const id = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(id);
    }
    if (mode === "online") {
      setRender(true);
      setShown(true);
      const id = setTimeout(() => setShown(false), 1800);
      return () => clearTimeout(id);
    }
    return;
  }, [mode]);

  if (!render) return null;

  const online = mode === "online";

  return (
    <div
      className={`offline-bar ${online ? "is-online" : ""} ${shown ? "is-shown" : ""}`}
      role="status"
      aria-live="polite"
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget && !shown) {
          setRender(false);
          setMode(null);
        }
      }}
    >
      <span className="ob-flip">
        <span className="ob-line ob-line--off">
          <WifiOff size={15} />
          {t("offline")}
        </span>
        <span className="ob-line ob-line--on">
          <Wifi size={15} />
          {t("backOnline")}
        </span>
      </span>
    </div>
  );
}
