"use client";

import { useRef, useState } from "react";

import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { scanReceipt, DEMO_RECEIPT } from "@/lib/ocr";
import { buzz } from "@/lib/util";
import type { ScanResult } from "@/lib/types";

import Screen from "./Screen";
import { Camera, Image as ImageIcon, Sparkle } from "./icons";

export default function Scan() {
  const t = useT();
  const lang = useStore((s) => s.lang);
  const currency = useStore((s) => s.currency);
  const applyScan = useStore((s) => s.applyScan);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"load" | "read" | "tidy">("load");

  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const run = async (file: File) => {
    buzz(10);
    setBusy(true);
    setProgress(0.04);
    setStatus("load");
    const res = await scanReceipt(
      file,
      (p, s) => {
        setProgress(p);
        if (s === "read") setStatus("read");
        else if (s === "tidy") setStatus("tidy");
      },
      lang === "id" ? "ind" : "eng",
      currency,
    );
    setProgress(1);
    setTimeout(() => applyScan(res), 250);
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) run(f);
    e.target.value = "";
  };

  const sample = () => {
    buzz(8);
    const res: ScanResult = {
      ...DEMO_RECEIPT,
      items: DEMO_RECEIPT.items.map((i) => ({ ...i })),
      source: "demo",
    };
    applyScan(res);
  };

  const statusLabel =
    status === "read"
      ? t("scan.statusRead")
      : status === "tidy"
        ? t("scan.statusTidy")
        : t("scan.statusLoad");

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
              <span className="vf-scanline" />
              <div className="vf-status">
                <div className="vf-pct disp tnum">{Math.round(progress * 100)}%</div>
                <div className="muted">{statusLabel}</div>
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
            <button className="btn" onClick={() => cameraRef.current?.click()}>
              <Camera size={20} /> {t("scan.takePhoto")}
            </button>
            <button className="btn secondary" onClick={() => uploadRef.current?.click()}>
              <ImageIcon size={18} /> {t("scan.upload")}
            </button>
            <button className="btn ghost" onClick={sample}>
              <Sparkle size={18} /> {t("scan.sample")}
            </button>
          </div>
        ) : null}
      </div>
    </Screen>
  );
}
