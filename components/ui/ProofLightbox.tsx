"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useT } from "@/lib/i18n";

import { X } from "@/components/icons";

/* The receipt, full screen.
   Portalled to <body> on purpose: this used to render inside the screen's
   transition wrapper, and a transformed ancestor makes position:fixed resolve
   against that element rather than the viewport, so the "full screen" overlay
   covered only the middle of the page.

   Two sizes, because one is never enough. A phone screenshot is around
   1170x2532; fitted to a 390pt screen that is 29% scale, which is honest about
   the whole image and useless for reading the amount. The app sets
   maximumScale: 1 so the browser's own pinch-zoom is unavailable, which means
   the zoom has to live here. Tap the image to switch between fitting the
   screen and filling the width; tap anywhere else to close. */

interface Props {
  src: string;
  label: string;
  onClose: () => void;
}

export default function ProofLightbox({ src, label, onClose }: Props) {
  const t = useT();
  const [mounted, setMounted] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`proof-overlay ${zoomed ? "is-zoomed" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={onClose}
    >
      {/* Zoomed, the image fills the screen and there is no backdrop left to
          tap, so closing needs a control of its own. */}
      <button
        className="proof-overlay__close"
        aria-label={t("common.close")}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <X size={20} />
      </button>

      {/* The scroller is its own element because the overlay carries a
          backdrop-filter, and a filtered ancestor becomes the containing block
          for position:fixed children -- the close button scrolled away with the
          image instead of staying put. */}
      <div className="proof-overlay__scroll">
        <img
          className="proof-overlay__img"
          src={src}
          alt={label}
          // The image swallows the tap so zooming does not also dismiss.
          onClick={(e) => {
            e.stopPropagation();
            setZoomed((z) => !z);
          }}
        />
      </div>
      <p className="proof-overlay__hint" aria-live="polite">
        {zoomed ? t("shared.proofZoomOut") : t("shared.proofZoomIn")}
      </p>
    </div>,
    document.body,
  );
}
