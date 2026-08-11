"use client";

import { useState } from "react";

import { useT } from "@/lib/i18n";
import { maskedOf } from "@/lib/mask";
import { methodMeta } from "@/lib/payments";
import { useCopyAnim } from "@/lib/hooks";
import type { PayMethodKey } from "@/lib/types";

import { Eye, EyeOff } from "@/components/icons";
import CopyTick from "./CopyTick";

/** Shows the masked number; copying always hands over the real one. */
export default function AccountRow({
  methodKey,
  value,
  masked,
}: {
  methodKey: PayMethodKey;
  value: string;
  masked?: string;
}) {
  const t = useT();
  const { phase, copy } = useCopyAnim();
  const [shown, setShown] = useState(false);
  const meta = methodMeta(methodKey);

  const display = shown ? value : maskedOf({ key: methodKey, value, masked });

  return (
    <div className="acct acct--tap">
      <span className="acct__dot" style={{ background: meta.color }} />
      <button
        className="acct__main"
        onClick={() => copy(value)}
        aria-label={t("breakdown.copyAccount", { method: meta.label })}
      >
        <span className="grow" style={{ textAlign: "left", minWidth: 0 }}>
          <span className="acct__label">{meta.label}</span>
          <span className={`acct__val truncate ${shown ? "" : "is-masked"}`}>
            {display || "—"}
          </span>
        </span>
        <CopyTick phase={phase} size={16} />
      </button>
      {value ? (
        <button
          className="acct__eye"
          aria-label={t(shown ? "payment.hide" : "payment.reveal")}
          aria-pressed={shown}
          onClick={() => setShown((isShown) => !isShown)}
        >
          {shown ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      ) : null}
    </div>
  );
}
