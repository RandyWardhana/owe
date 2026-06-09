"use client";

import type { ReactNode } from "react";

import type { CopyPhase } from "@/lib/hooks";
import { Copy, Check } from "@/components/icons";

export default function CopyTick({
  phase,
  size = 15,
  icon,
}: {
  phase: CopyPhase;
  size?: number;
  icon?: ReactNode;
}) {
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
