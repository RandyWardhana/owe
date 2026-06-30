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
