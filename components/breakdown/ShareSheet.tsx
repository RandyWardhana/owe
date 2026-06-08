"use client";

import { useT } from "@/lib/i18n";
import { useClipboard } from "@/lib/hooks";

import Sheet from "@/components/Sheet";
import { Share, Copy, Wallet } from "@/components/icons";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  link: string;
  label: string;
  summary: string;
}

export default function ShareSheet({ open, onClose, title, link, label, summary }: Props) {
  const t = useT();
  const copy = useClipboard();

  const shareOrCopy = async () => {
    if (!link) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: title || "owe", url: link });
        return;
      } catch {}
    }
    copy(link);
  };

  return (
    <Sheet open={open} onClose={onClose} title={t("breakdown.shareTitle")}>
      <p className="muted" style={{ marginTop: 0 }}>
        {t("breakdown.shareBlurb")}
      </p>
      <button className="btn" disabled={!link} onClick={shareOrCopy}>
        <Share size={18} /> {t("breakdown.copyLink")}
      </button>
      <div className="share-link">{label}</div>
      <p className="label" style={{ marginTop: 18 }}>
        {t("breakdown.orCopyText")}
      </p>
      <button className="btn secondary" onClick={() => copy(summary)}>
        <Copy size={18} /> {t("breakdown.copyText")}
      </button>
      <p className="muted share-foot">
        <Wallet size={14} /> {t("breakdown.cleanResult")}
      </p>
    </Sheet>
  );
}
