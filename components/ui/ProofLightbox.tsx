"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/* The receipt, full screen.
   Portalled to <body> on purpose: this used to render inside the screen's
   transition wrapper, which carries a transform. A transformed ancestor makes
   `position: fixed` resolve against that element rather than the viewport and
   opens its own stacking context, so the "full screen" overlay covered only the
   middle of the page and slid under the install banner. */

interface Props {
  src: string;
  label: string;
  onClose: () => void;
}

export default function ProofLightbox({ src, label, onClose }: Props) {
  const [mounted, setMounted] = useState(false);

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
    <div className="proof-overlay" role="dialog" aria-modal="true" aria-label={label} onClick={onClose}>
      <img className="proof-overlay__img" src={src} alt={label} />
    </div>,
    document.body,
  );
}
