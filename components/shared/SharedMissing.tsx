"use client";

import { useT } from "@/lib/i18n";
import type { BillMissing } from "@/lib/bills";

import Screen from "@/components/Screen";
import { Receipt, WifiOff } from "@/components/icons";

/* What to tell someone whose shared link did not open. The person holding the
   link cannot fix a server, so they get the plain version; whoever is running
   it locally also gets the setting that is missing. */
const DEV_HINT: Partial<Record<BillMissing, string>> = {
  "no-cloud":
    "NEXT_PUBLIC_OWE_CLOUD is not set to 1, so short links are never fetched. Copy .env.local.example to .env.local and restart the dev server.",
  "no-db": "The server has no OWE_DB_URL / OWE_DB_SECRET. Set them in .env.local (see worker/README.md).",
  "db-unreachable":
    "OWE_DB_URL is set, but the owe-db Worker did not answer, or rejected OWE_DB_SECRET.",
  server: "/api/bill failed. Check the dev server's terminal.",
};

export default function SharedMissing({
  reason,
  onMakeOwn,
}: {
  reason: BillMissing;
  onMakeOwn: () => void;
}) {
  const t = useT();
  const kind =
    reason === "offline"
      ? "offline"
      : reason === "not-found"
        ? "notFound"
        : reason === "unreadable"
          ? "unreadable"
          : "unavailable";
  const retry = kind === "offline" || kind === "unavailable";
  const hint = process.env.NODE_ENV === "development" ? DEV_HINT[reason] : undefined;

  return (
    <Screen
      footer={
        <div className="col-gap">
          {retry ? (
            <button className="btn" onClick={() => window.location.reload()}>
              {t("shared.missing.retry")}
            </button>
          ) : null}
          <button className="btn secondary" onClick={onMakeOwn}>
            {t("shared.makeOwn")}
          </button>
        </div>
      }
    >
      <div className="pad rise" style={{ paddingTop: "calc(20px + var(--safe-top))" }}>
        <div className="shared-mark disp">{t("app.name")}</div>
        <div className="card empty" style={{ marginTop: 18 }}>
          {kind === "offline" ? <WifiOff size={28} /> : <Receipt size={28} />}
          <h2 className="disp shared-title" style={{ color: "var(--ink)" }}>
            {t(`shared.missing.${kind}Title`)}
          </h2>
          <p>{t(`shared.missing.${kind}Body`)}</p>
        </div>
        {hint ? (
          <div className="banner" style={{ marginTop: 12 }}>
            <strong>Dev: {reason}</strong> — {hint}
          </div>
        ) : null}
      </div>
    </Screen>
  );
}
