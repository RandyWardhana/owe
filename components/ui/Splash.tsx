"use client";

import { useT } from "@/lib/i18n";
import type { SplashCoverProps } from "@/entities/props/ui";

export default function SplashCover({ leaving }: SplashCoverProps) {
  const t = useT();

  return (
    <div
      className={`splash${leaving ? " is-leaving" : ""}`}
      role="status"
      aria-label={t("app.loading")}
      aria-hidden={leaving}
    >
      <span className="splash__mark disp" aria-hidden="true">
        {t("app.name")}
      </span>
      <span className="splash__bar" aria-hidden="true">
        <i />
      </span>
    </div>
  );
}
