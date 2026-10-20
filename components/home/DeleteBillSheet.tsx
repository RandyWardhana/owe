"use client";

import { useT } from "@/lib/i18n";

import Sheet from "@/components/Sheet";
import type { DeleteBillSheetProps } from "@/entities/props/desk";

export default function DeleteBillSheet({ bill, onCancel, onConfirm }: DeleteBillSheetProps) {
  const t = useT();

  return (
    <Sheet open={!!bill} onClose={onCancel} title={t("home.deleteTitle")}>
      <p className="muted" style={{ marginTop: 0 }}>
        {t("home.deleteBody", { name: bill?.title || t("shared.defaultTitle") })}
      </p>
      <div className="row" style={{ gap: 10, marginTop: 14 }}>
        <button className="btn secondary" style={{ width: "auto", flex: 1 }} onClick={onCancel}>
          {t("common.cancel")}
        </button>
        <button className="btn danger" style={{ width: "auto", flex: 1 }} onClick={onConfirm}>
          {t("home.deleteConfirm")}
        </button>
      </div>
    </Sheet>
  );
}
