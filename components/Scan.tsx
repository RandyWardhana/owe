"use client";

import { useRef, useState } from "react";

import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { scanReceipt } from "@/lib/ocr";
import { buzz } from "@/lib/util";

import Screen from "./Screen";
import { Camera, Image as ImageIcon } from "./icons";
import { track } from "@/lib/analytics";

export default function Scan() {
  const t = useT();
  const currency = useStore((s) => s.currency);
  const applyScan = useStore((s) => s.applyScan);
  const showToast = useStore((s) => s.showToast);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const run = async (file: File) => {
    buzz(10);
    const url = URL.createObjectURL(file);
    setPreview(url);
    setBusy(true);
    setProgress(0.08);

    let creepProgress = 0.08;
    const creep = setInterval(() => {
      creepProgress += (0.92 - creepProgress) * 0.085;
      setProgress(creepProgress);
    }, 180);

    const started = Date.now();
    const res = await scanReceipt(file, currency);
    clearInterval(creep);
    track("scan_result", {
      outcome: res ? "read" : "empty",
      seconds: Math.round((Date.now() - started) / 1000),
    });
    setProgress(1);

    if (!res) {
      showToast("scan.empty");
      setTimeout(() => {
        setBusy(false);
        setProgress(0);
        setPreview(null);
        URL.revokeObjectURL(url);
      }, 450);
      return;
    }
    setTimeout(() => {
      URL.revokeObjectURL(url);
      applyScan(res);
    }, 400);
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) run(file);
    e.target.value = "";
  };

  const offline = () => {
    if (typeof navigator === "undefined" || navigator.onLine) return false;
    buzz(20);
    track("scan_result", { outcome: "offline" });
    showToast("scan.offline");
    return true;
  };

  const pick = (ref: React.RefObject<HTMLInputElement | null>) => {
    if (!offline()) ref.current?.click();
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = [...e.dataTransfer.files].find((dropped) => dropped.type.startsWith("image/"));
    if (busy || !file) return;
    if (!offline()) run(file);
  };

  return (
    <Screen title={t("scan.title")}>
      <div className="pad">
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={onPick}
        />
        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          hidden
          onChange={onPick}
        />

        <div
          className={`viewfinder ${busy ? "is-busy" : ""}${dragging ? " is-dragging" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            if (!busy) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <span className="vf-corner tl" />
          <span className="vf-corner tr" />
          <span className="vf-corner bl" />
          <span className="vf-corner br" />
          {busy ? (
            <>
              {preview ? <img className="vf-photo" src={preview} alt="" /> : null}
              <span className="vf-scanline" />
              <div className="vf-status">
                <div className="vf-pct disp tnum">{Math.round(progress * 100)}%</div>
                <div className="vf-status-label">{t("scan.statusRead")}</div>
                <div className="vf-bar">
                  <i style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
              </div>
            </>
          ) : (
            <div className="vf-hint">
              <Camera size={34} />
              <div className="disp">{t("scan.point")}</div>
              <p className="vf-drop">{t("desk.scan.drop")}</p>
              <p className="muted vf-privacy">{t("scan.privacy")}</p>
            </div>
          )}
        </div>

        {!busy ? (
          <div className="col-gap" style={{ marginTop: 18 }}>
            <button className="btn scan-take" onClick={() => pick(cameraRef)}>
              <Camera size={20} /> {t("scan.takePhoto")}
            </button>
            <button className="btn secondary scan-upload" onClick={() => pick(uploadRef)}>
              <ImageIcon size={18} /> {t("scan.upload")}
            </button>
          </div>
        ) : null}
      </div>
    </Screen>
  );
}
