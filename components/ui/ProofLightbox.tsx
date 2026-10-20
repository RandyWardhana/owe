"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useT } from "@/lib/i18n";

import { X } from "@/components/icons";
import type { ProofLightboxProps } from "@/entities/props/ui";

/* Portalled to <body>: a transformed ancestor makes position:fixed resolve
   against it instead of the viewport. A fitted phone screenshot is too small to
   read the amount, so tapping the image toggles fill-width; tapping elsewhere closes. */

export default function ProofLightbox({ src, label, onClose }: ProofLightboxProps) {
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

      {/* A separate scroller: the overlay's backdrop-filter makes it the
          containing block for position:fixed children, so the close button
          would scroll away with the image. */}
      <div className="proof-overlay__scroll">
        <img
          className="proof-overlay__img"
          src={src}
          alt={label}
          // The image swallows the tap so zooming does not also dismiss.
          onClick={(e) => {
            e.stopPropagation();
            setZoomed((wasZoomed) => !wasZoomed);
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
