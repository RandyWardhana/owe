"use client";

import { methodMeta } from "@/lib/payments";
import { useCopyAnim } from "@/lib/hooks";
import type { PayMethodKey } from "@/lib/types";

import CopyTick from "./CopyTick";

export default function AccountRow({
  methodKey,
  value,
}: {
  methodKey: PayMethodKey;
  value: string;
}) {
  const { phase, copy } = useCopyAnim();
  const m = methodMeta(methodKey);

  return (
    <button className="acct acct--tap" onClick={() => copy(value)}>
      <span className="acct__dot" style={{ background: m.color }} />
      <div className="grow" style={{ textAlign: "left" }}>
        <div className="acct__label">{m.label}</div>
        <div className="acct__val truncate">{value || "—"}</div>
      </div>
      <CopyTick phase={phase} size={16} />
    </button>
  );
}
