"use client";

import { useT } from "@/lib/i18n";
import type { BillMissing } from "@/entities/share";

import StatusScreen from "@/components/StatusScreen";
import { CloudOff, LinkOff, ReceiptX, WifiOff } from "@/components/icons";
import type { SharedMissingProps } from "@/entities/props/shared";

// The person holding the link cannot fix a server, so they get the plain version; whoever
// runs it locally also gets the setting that is missing.
const DEV_HINT: Partial<Record<BillMissing, string>> = {
  "no-cloud":
    "NEXT_PUBLIC_OWE_CLOUD is not set to 1, so short links are never fetched. Copy .env.local.example to .env.local and restart the dev server.",
  "no-db": "The server has no OWE_DB_URL / OWE_DB_SECRET. Set them in .env.local (see worker/README.md).",
  "db-unreachable": "OWE_DB_URL is set, but the owe-db Worker did not answer, or rejected OWE_DB_SECRET.",
  server: "/api/bill failed. Check the dev server's terminal.",
};

const ICON = {
  offline: <WifiOff />,
  notFound: <ReceiptX />,
  unreadable: <LinkOff />,
  unavailable: <CloudOff />,
};

export default function SharedMissing({ reason, onMakeOwn }: SharedMissingProps) {
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
    <StatusScreen
      icon={ICON[kind]}
      tone={kind === "unavailable" ? "warn" : "neutral"}
      title={t(`shared.missing.${kind}Title`)}
      body={t(`shared.missing.${kind}Body`)}
      actions={
        <>
          {retry ? (
            <button className="btn" onClick={() => window.location.reload()}>
              {t("shared.missing.retry")}
            </button>
          ) : null}
          <button className={`btn${retry ? " secondary" : ""}`} onClick={onMakeOwn}>
            {t("shared.makeOwn")}
          </button>
        </>
      }
    >
      {hint ? (
        <div className="banner status__hint">
          <strong>Dev: {reason}</strong> — {hint}
        </div>
      ) : null}
    </StatusScreen>
  );
}
