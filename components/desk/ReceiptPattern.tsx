"use client";

import { useId, useMemo } from "react";

import { useT } from "@/lib/i18n";
import { PATTERN_TILE, patternWords } from "@/lib/pattern";
import type { ReceiptPatternProps } from "@/entities/props/desk";

export default function ReceiptPattern({ seed }: ReceiptPatternProps) {
  const t = useT();
  const id = `rp-pattern-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const words = useMemo(() => patternWords(seed), [seed]);

  return (
    <svg className="rp__pattern" aria-hidden="true">
      <defs>
        <pattern id={id} width={PATTERN_TILE.width} height={PATTERN_TILE.height} patternUnits="userSpaceOnUse">
          {words.map((word) => (
            <text
              key={word.key}
              x={word.x}
              y={word.y}
              fontSize={word.size}
              transform={word.rotate ? `rotate(${word.rotate} ${word.x} ${word.y})` : undefined}
              className={`rp__word rp__word--fill`}
            >
              {t("app.name")}
            </text>
          ))}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
