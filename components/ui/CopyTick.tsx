"use client";

import { Copy, Check } from "@/components/icons";
import type { CopyTickProps } from "@/entities/props/ui";

export default function CopyTick({
  phase,
  size = 15,
  icon,
}: CopyTickProps) {
  return (
    <span className="cp-swap" data-phase={phase}>
      <span className="cp-copy">{icon ?? <Copy size={size} />}</span>
      <span className="cp-check">
        <span className="cp-pop">
          <Check size={size} className="cp-tick" />
        </span>
      </span>
    </span>
  );
}
