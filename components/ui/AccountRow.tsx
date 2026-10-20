"use client";

import { methodMeta } from "@/lib/payments";
import { useCopyAnim } from "@/lib/hooks";

import CopyTick from "./CopyTick";
import type { AccountRowProps } from "@/entities/props/ui";

export default function AccountRow({
  methodKey,
  value,
}: AccountRowProps) {
  const { phase, copy } = useCopyAnim();
  const meta = methodMeta(methodKey);

  return (
    <button className="acct acct--tap" onClick={() => copy(value)}>
      <span className="acct__dot" style={{ background: meta.color }} />
      <div className="grow" style={{ textAlign: "left" }}>
        <div className="acct__label">{meta.label}</div>
        <div className="acct__val truncate">{value || "—"}</div>
      </div>
      <CopyTick phase={phase} size={16} />
    </button>
  );
}
