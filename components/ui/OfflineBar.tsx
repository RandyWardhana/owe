"use client";

import { useEffect, useRef, useState } from "react";

import { useT } from "@/lib/i18n";
import { Wifi, WifiOff } from "@/components/icons";

export default function OfflineBar() {
  const t = useT();
  const [mode, setMode] = useState<"offline" | "online" | null>(null);
  const [render, setRender] = useState(false);
  const [shown, setShown] = useState(false);
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

  useEffect(() => {
    document.documentElement.toggleAttribute("data-offline", shown);
  }, [shown]);

  useEffect(() => {
    if (shown || !render) return;
    const id = setTimeout(() => {
      setRender(false);
      setMode(null);
    }, 360);
    return () => clearTimeout(id);
  }, [shown, render]);

  useEffect(() => {
    if (mode === "offline") {
      setRender(true);
      const id = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(id);
    }
    if (mode === "online") {
      setRender(true);
      setShown(true);
      const id = setTimeout(() => setShown(false), 2500);
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
        <span className="ob-track">
          <span className="ob-line">
            <WifiOff size={15} />
            {t("offline")}
          </span>
          <span className="ob-line">
            <Wifi size={15} />
            {t("backOnline")}
          </span>
        </span>
      </span>
    </div>
  );
}
