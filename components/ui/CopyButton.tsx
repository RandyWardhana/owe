"use client";

import { useCopyAnim } from "@/lib/hooks";

import CopyTick from "./CopyTick";

export default function CopyButton({
  text,
  label,
}: {
  text: string;
  label: string;
}) {
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
