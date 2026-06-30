"use client";

import { useStore } from "@/lib/store";
import { useT, LANGS } from "@/lib/i18n";
import { CURRENCIES } from "@/lib/currency";
import { buzz } from "@/lib/util";
import type { Lang, Rounding, Theme } from "@/lib/types";

import Sheet from "./Sheet";
import SyncSettings from "./SyncSettings";
import { Sun, Moon, Check, Chevron } from "./icons";

const ACCENTS = ["#9be52e", "#ffd23f", "#ff8a3d", "#ff5d8f", "#9b8cff", "#3dd7d0"];
const ROUNDINGS: { value: Rounding; key: string }[] = [
  { value: "none", key: "settings.roundExact" },
  { value: "whole", key: "settings.roundWhole" },
  { value: "up5", key: "settings.roundUp5" },
];

export default function Settings({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const theme = useStore((s) => s.theme);
  const lang = useStore((s) => s.lang);
  const accent = useStore((s) => s.accent);
  const anim = useStore((s) => s.anim);
  const currency = useStore((s) => s.currency);
  const rounding = useStore((s) => s.rounding);
  const setTheme = useStore((s) => s.setTheme);
  const setLang = useStore((s) => s.setLang);
  const setAccent = useStore((s) => s.setAccent);
  const setAnim = useStore((s) => s.setAnim);
  const setCurrency = useStore((s) => s.setCurrency);
  const setRounding = useStore((s) => s.setRounding);

  const pickTheme = (next: Theme) => {
    buzz(8);
    const root = document.documentElement;
    root.classList.add("theme-switching");
    setTheme(next);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => root.classList.remove("theme-switching")),
    );
  };

  return (
    <Sheet open={open} onClose={onClose} title={t("settings.title")}>
      <p className="label">{t("settings.appearance")}</p>
      <div className="set-group">
        <div className="set-item">
          <span className="set-item__label">{t("settings.theme")}</span>
          <div className="seg">
            <button
              className={`seg__btn ${theme === "light" ? "on" : ""}`}
              onClick={() => pickTheme("light")}
            >
              <Sun size={16} /> {t("settings.light")}
            </button>
            <button
              className={`seg__btn ${theme === "dark" ? "on" : ""}`}
              onClick={() => pickTheme("dark")}
            >
              <Moon size={16} /> {t("settings.dark")}
            </button>
          </div>
        </div>

        <div className="set-item">
          <span className="set-item__label">{t("settings.accent")}</span>
          <div className="swatches">
            {ACCENTS.map((c) => (
              <button
                key={c}
                className={`swatch ${accent === c ? "on" : ""}`}
                style={{ background: c }}
                aria-label={c}
                onClick={() => {
                  buzz(6);
                  setAccent(c);
                }}
              >
                {accent === c ? <Check size={15} /> : null}
              </button>
            ))}
          </div>
        </div>

        <div className="set-item">
          <span className="set-item__label">{t("settings.animations")}</span>
          <button
            className={`toggle ${anim ? "on" : ""}`}
            role="switch"
            aria-checked={anim}
            onClick={() => {
              buzz(6);
              setAnim(!anim);
            }}
          >
            <span className="toggle__knob" />
          </button>
        </div>
      </div>

      <p className="label">{t("settings.language")}</p>
      <div className="set-group">
        <div className="set-item set-item--stack">
          <div className="seg seg--full">
            {LANGS.map((l) => (
              <button
                key={l.value}
                className={`seg__btn ${lang === l.value ? "on" : ""}`}
                onClick={() => {
                  buzz(6);
                  setLang(l.value as Lang);
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="label">{t("settings.money")}</p>
      <div className="set-group">
        <div className="set-item">
          <span className="set-item__label">{t("settings.currency")}</span>
          <div className="set-select">
            <select
              value={currency}
              onChange={(e) => {
                buzz(5);
                setCurrency(e.target.value);
              }}
            >
              {Object.keys(CURRENCIES).map((code) => (
                <option key={code} value={code}>
                  {CURRENCIES[code].sym} {code}
                </option>
              ))}
            </select>
            <Chevron size={16} className="set-select__chev" />
          </div>
        </div>

        <div className="set-item">
          <span className="set-item__label">{t("settings.rounding")}</span>
          <div className="seg">
            {ROUNDINGS.map((r) => (
              <button
                key={r.value}
                className={`seg__btn ${rounding === r.value ? "on" : ""}`}
                onClick={() => {
                  buzz(5);
                  setRounding(r.value);
                }}
              >
                {t(r.key)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <SyncSettings />

      <p className="muted about">{t("settings.about")}</p>
    </Sheet>
  );
}
