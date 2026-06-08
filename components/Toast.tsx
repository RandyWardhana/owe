"use client";

import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { useAutoDismiss } from "@/lib/hooks";

export default function Toast() {
  const toast = useStore((s) => s.toast);
  const clearToast = useStore((s) => s.clearToast);
  const t = useT();

  useAutoDismiss(toast, clearToast);

  if (!toast) return null;

  return (
    <div className="toast" key={toast.id} role="status">
      {t(toast.msg)}
    </div>
  );
}
