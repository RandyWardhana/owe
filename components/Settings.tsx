"use client";

import { useStore } from "@/lib/store";
import { useT, LANGS } from "@/lib/i18n";
import { ACCENTS } from "@/lib/accents";
import { CURRENCIES } from "@/lib/currency";
import { buzz } from "@/lib/util";
import { originOf, switchTheme } from "@/lib/themeTransition";
import type { Lang, Rounding, Theme } from "@/lib/types";

import Sheet from "./Sheet";
import SyncSettings from "./SyncSettings";
import { Sun, Moon, Check, Chevron } from "./icons";


const ROUNDINGS: { value: Rounding; key: string }[] = [
  { value: "none", key: "settings.roundExact" },
  { value: "whole", key: "settings.roundWhole" },
  { value: "up5", key: "settings.roundUp5" },
];

interface SettingsOptions {
  /* Set when opened over a shared bill: money settings then mean "show this
     bill in", and rounding and backups -- which act on your own bills -- go. */
  billCurrency?: string;
  /* The /landing page: there is no bill to show money for and nothing to back
     up, so only look-and-feel and language. Same controls, same stored
     settings, so a choice made there is already in place when the app opens. */
  appearanceOnly?: boolean;
}

/* The settings themselves, without a container. The app and shared links show
   them in a bottom sheet (Settings, below); /landing on a desktop shows them in
   a dropdown under its gear, where a sheet rising from the bottom of a wide
   screen looked out of place. */
export function SettingsBody({ billCurrency, appearanceOnly = false }: SettingsOptions) {
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
  const viewCurrency = useStore((s) => s.viewCurrency);
  const setViewCurrency = useStore((s) => s.setViewCurrency);

  const pickTheme = (next: Theme, event: React.MouseEvent<HTMLButtonElement>) => {
    buzz(8);
    switchTheme(next, setTheme, originOf(event));
  };

  return (
    <>
      <p className="label">{t("settings.appearance")}</p>
      <div className="set-group">
        <div className="set-item">
          <span className="set-item__label">{t("settings.theme")}</span>
          <div className="seg">
            <button
              className={`seg__btn ${theme === "light" ? "on" : ""}`}
              onClick={(e) => pickTheme("light", e)}
            >
              <Sun size={16} className="seg__sun" /> {t("settings.light")}
            </button>
            <button
              className={`seg__btn ${theme === "dark" ? "on" : ""}`}
              onClick={(e) => pickTheme("dark", e)}
            >
              <Moon size={16} className="seg__moon" /> {t("settings.dark")}
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

      {appearanceOnly ? null : <p className="label">{t("settings.money")}</p>}
      {appearanceOnly ? null : billCurrency ? (
        <div className="set-group">
          <div className="set-item">
            <span className="set-item__label">{t("settings.viewIn")}</span>
            <div className="set-select">
              <select
                value={viewCurrency && viewCurrency !== billCurrency ? viewCurrency : billCurrency}
                onChange={(e) => {
                  buzz(5);
                  setViewCurrency(e.target.value === billCurrency ? null : e.target.value);
                }}
              >
                {Object.keys(CURRENCIES).map((code) => (
                  <option key={code} value={code}>
                    {CURRENCIES[code].sym} {code}
                    {code === billCurrency ? ` · ${t("settings.billsOwn")}` : ""}
                  </option>
                ))}
              </select>
              <Chevron size={16} className="set-select__chev" />
            </div>
          </div>
        </div>
      ) : (
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
      )}

      {billCurrency || appearanceOnly ? null : <SyncSettings />}

      <p className="muted about">{t("settings.about")}</p>
    </>
  );
}

export default function Settings({
  open,
  onClose,
  ...options
}: SettingsOptions & { open: boolean; onClose: () => void }) {
  const t = useT();
  return (
    <Sheet open={open} onClose={onClose} title={t("settings.title")}>
      <SettingsBody {...options} />
    </Sheet>
  );
}
