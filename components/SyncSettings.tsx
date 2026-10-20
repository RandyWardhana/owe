"use client";

import { useEffect, useState } from "react";

import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { NAME_MAX, deviceId, setDeviceId, setSyncName, syncName } from "@/lib/device";
import { pullHistory, pushHistory } from "@/lib/userBills";
import { hasCloudSync } from "@/lib/cloudSync";
import { buzz } from "@/lib/util";

import CopyButton from "@/components/ui/CopyButton";

export default function SyncSettings() {
  const t = useT();
  const mergeHistory = useStore((s) => s.mergeHistory);
  const showToast = useStore((s) => s.showToast);

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [savedName, setSavedName] = useState("");
  const myCode = deviceId();

  useEffect(() => {
    const stored = syncName();
    setName(stored);
    setSavedName(stored);
  }, []);

  if (!hasCloudSync) return null;

  const saveName = () => {
    const next = name.trim().slice(0, NAME_MAX);
    setName(next);
    if (next === savedName) return;
    setSyncName(next);
    setSavedName(next);
    const { history, tombstones } = useStore.getState();
    pushHistory(history, tombstones);
    showToast(next ? "settings.syncNameSaved" : "settings.syncNameCleared");
  };

  const restore = async () => {
    const trimmedCode = code.trim();
    if (!trimmedCode || busy) return;
    buzz(8);
    setBusy(true);
    const prev = deviceId();
    setDeviceId(trimmedCode);
    const remote = await pullHistory();
    if (remote && remote.history.length) {
      mergeHistory(remote.history, remote.tombstones);
      pushHistory(useStore.getState().history, useStore.getState().tombstones);
      setCode("");
      showToast("settings.syncDone");
    } else {
      setDeviceId(prev);
      showToast("settings.syncEmpty");
    }
    setBusy(false);
  };

  return (
    <>
      <p className="label">{t("settings.sync")}</p>
      <div className="set-group">
        <div className="set-item set-item--stack">
          <label className="set-item__label" htmlFor="sync-name">
            {t("settings.syncName")}
          </label>
          <p className="muted set-hint">{t("settings.syncNameHint")}</p>
          <input
            id="sync-name"
            className="sync-input"
            value={name}
            maxLength={NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            placeholder={t("settings.syncNamePlaceholder")}
            autoComplete="nickname"
            enterKeyHint="done"
          />
        </div>

        <div className="set-item set-item--stack">
          <span className="set-item__label">{t("settings.syncCode")}</span>
          <p className="muted set-hint">{t("settings.syncCodeHint")}</p>
          <div className="sync-code">
            <code className="sync-code__val truncate">{myCode}</code>
            <CopyButton text={myCode} label={t("settings.syncCopy")} />
          </div>
        </div>

        <div className="set-item set-item--stack">
          <span className="set-item__label">{t("settings.syncRestore")}</span>
          <p className="muted set-hint">{t("settings.syncRestoreHint")}</p>
          <div className="sync-restore">
            <input
              className="sync-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("settings.syncPlaceholder")}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <button
              className="btn"
              style={{ width: "auto" }}
              disabled={!code.trim() || busy}
              onClick={restore}
            >
              {busy ? t("settings.syncRestoring") : t("settings.syncRestoreBtn")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
