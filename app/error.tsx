"use client";

import { useEffect } from "react";

import { useT } from "@/lib/i18n";
import StatusScreen, { StatusLink } from "@/components/StatusScreen";
import { Warning } from "@/components/icons";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      icon={<Warning size={28} />}
      tone="warn"
      title={t("status.errorTitle")}
      body={t("status.errorBody")}
      actions={
        <>
          <button className="btn" onClick={() => reset()}>
            {t("status.retry")}
          </button>
          <StatusLink href="/" variant="secondary">
            {t("status.home")}
          </StatusLink>
        </>
      }
    >
      {error.digest ? (
        <p className="status__digest">
          {t("status.details")}: <code>{error.digest}</code>
        </p>
      ) : null}
    </StatusScreen>
  );
}
