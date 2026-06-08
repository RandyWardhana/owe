"use client";

import { useEffect, useState } from "react";

import { useT } from "@/lib/i18n";

import { X } from "@/components/icons";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "owe.install.dismissedAt";
const DISMISS_MS = 3 * 24 * 60 * 60 * 1000;

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
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      nav.standalone === true;
    if (standalone) return;

    if (dismissedRecently()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    const ua = nav.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/crios|fxios|chrome|android/i.test(ua);
    if (isIOS && isSafari) {
      setIosHint(true);
      setVisible(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
  };

  return (
    <div className="install-banner rise" role="dialog" aria-label={t("install.title")}>
      <img src="/icon.svg" alt="" className="install-banner__icon" />
      <div className="install-banner__text">
        <strong>{t("install.title")}</strong>
        <span>{iosHint ? t("install.iosHint") : t("install.subtitle")}</span>
      </div>
      {!iosHint && deferred ? (
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
