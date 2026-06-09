"use client";

import { useState } from "react";

import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { deviceId, setDeviceId } from "@/lib/device";
import { pullHistory, pushHistory } from "@/lib/userBills";
import { hasSupabase } from "@/lib/supabase";
import { buzz } from "@/lib/util";

import CopyButton from "@/components/ui/CopyButton";

export default function SyncSettings() {
  const t = useT();
  const mergeHistory = useStore((s) => s.mergeHistory);
  const showToast = useStore((s) => s.showToast);

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const myCode = deviceId();

  if (!hasSupabase) return null;

  const restore = async () => {
    const c = code.trim();
    if (!c || busy) return;
    buzz(8);
    setBusy(true);
    const prev = deviceId();
    setDeviceId(c);
    const remote = await pullHistory();
    if (remote && remote.length) {
      mergeHistory(remote);
      pushHistory(useStore.getState().history);
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
