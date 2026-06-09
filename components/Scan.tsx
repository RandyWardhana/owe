"use client";

import { useRef, useState } from "react";

import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { scanReceipt } from "@/lib/ocr";
import { buzz } from "@/lib/util";

import Screen from "./Screen";
import { Camera, Image as ImageIcon } from "./icons";

export default function Scan() {
  const t = useT();
  const currency = useStore((s) => s.currency);
  const applyScan = useStore((s) => s.applyScan);
  const showToast = useStore((s) => s.showToast);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);

  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const run = async (file: File) => {
    buzz(10);
    const url = URL.createObjectURL(file);
    setPreview(url);
    setBusy(true);
    setProgress(0.08);

    let p = 0.08;
    const creep = setInterval(() => {
      p += (0.92 - p) * 0.085;
      setProgress(p);
    }, 180);

    const res = await scanReceipt(file, currency);
    clearInterval(creep);
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
    const f = e.target.files?.[0];
    if (f) run(f);
    e.target.value = "";
  };

  const pick = (ref: React.RefObject<HTMLInputElement | null>) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      buzz(20);
      showToast("scan.offline");
      return;
    }
    ref.current?.click();
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

        <div className={`viewfinder ${busy ? "is-busy" : ""}`}>
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
              <p className="muted vf-privacy">{t("scan.privacy")}</p>
            </div>
          )}
        </div>

        {!busy ? (
          <div className="col-gap" style={{ marginTop: 18 }}>
            <button className="btn" onClick={() => pick(cameraRef)}>
              <Camera size={20} /> {t("scan.takePhoto")}
            </button>
            <button className="btn secondary" onClick={() => pick(uploadRef)}>
              <ImageIcon size={18} /> {t("scan.upload")}
            </button>
          </div>
        ) : null}
      </div>
    </Screen>
  );
}
