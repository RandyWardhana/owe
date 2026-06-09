"use client";

import type { TransitionEvent } from "react";
import { useEffect, useState } from "react";

import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";

import { X } from "@/components/icons";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "owe.install.dismissedAt";
const DISMISS_MS = 3 * 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 2000;

function dismissedRecently(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = Number(raw);
  if (!Number.isFinite(ts)) return false;
  if (Date.now() - ts < DISMISS_MS) return true;
  localStorage.removeItem(DISMISS_KEY);
  return false;
}

export default function InstallPrompt() {
  const t = useT();
  const anim = useStore((s) => s.anim);

  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [ready, setReady] = useState(false);
  const [render, setRender] = useState(false);
  const [openCls, setOpenCls] = useState(false);

  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      nav.standalone === true;
    if (standalone) return;
    if (dismissedRecently()) return;

    let timer: ReturnType<typeof setTimeout>;
    const showAfterDelay = () => {
      timer = setTimeout(() => setReady(true), SHOW_DELAY_MS);
    };

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      showAfterDelay();
    };
    const onInstalled = () => {
      setReady(false);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    const ua = nav.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/crios|fxios|chrome|android/i.test(ua);
    if (isIOS && isSafari) {
      setIosHint(true);
      showAfterDelay();
    }

    if (process.env.NODE_ENV === "development") showAfterDelay();

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (ready) setRender(true);
  }, [ready]);

  useEffect(() => {
    if (!render) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const instant = !anim || reduce;

    if (ready) {
      if (instant) {
        setOpenCls(true);
        return;
      }
      const id = requestAnimationFrame(() => setOpenCls(true));
      return () => cancelAnimationFrame(id);
    }

    setOpenCls(false);
    if (instant) setRender(false);
  }, [ready, render, anim]);

  if (!render) return null;

  const reduce =
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const instant = !anim || reduce;
  const isDev = process.env.NODE_ENV === "development";

  const dismiss = () => {
    setReady(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setReady(false);
  };

  const onTransitionEnd = (e: TransitionEvent) => {
    if (e.propertyName === "transform" && !openCls) setRender(false);
  };

  const cls =
    "install-banner" +
    (openCls ? " is-open" : "") +
    (instant ? " is-instant" : "");

  return (
    <div
      className={cls}
      role="dialog"
      aria-label={t("install.title")}
      onTransitionEnd={onTransitionEnd}
    >
      <img src="/icon.svg" alt="" className="install-banner__icon" />
      <div className="install-banner__text">
        <strong>{t("install.title")}</strong>
        <span>{iosHint ? t("install.iosHint") : t("install.subtitle")}</span>
      </div>
      {!iosHint && (deferred || isDev) ? (
        <button type="button" className="install-banner__cta" onClick={install}>
          {t("install.action")}
        </button>
      ) : null}
      <button
        type="button"
        className="install-banner__x"
        aria-label={t("install.dismiss")}
        onClick={dismiss}
      >
        <X size={18} />
      </button>
    </div>
  );
}
