"use client";

import { useT } from "@/lib/i18n";
import StatusScreen, { StatusLink } from "@/components/StatusScreen";
import { LinkOff } from "@/components/icons";

export default function NotFound() {
  const t = useT();

  return (
    <StatusScreen
      icon={<LinkOff />}
      title={t("status.notFoundTitle")}
      body={t("status.notFoundBody")}
      actions={<StatusLink href="/">{t("status.home")}</StatusLink>}
    />
  );
}
