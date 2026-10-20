"use client";

import { useCopyAnim } from "@/lib/hooks";

import CopyTick from "./CopyTick";
import type { CopyButtonProps } from "@/entities/props/ui";

export default function CopyButton({
  text,
  label,
}: CopyButtonProps) {
  const { phase, copy } = useCopyAnim();

  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    copy(text);
  };

  return (
    <button
      className={`pp__copy ${phase !== "idle" ? "is-done" : ""}`}
      aria-label={label}
      onClick={onClick}
    >
      <CopyTick phase={phase} size={15} />
    </button>
  );
}
