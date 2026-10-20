"use client";

import { useT } from "@/lib/i18n";
import StatusScreen, { StatusLink } from "@/components/StatusScreen";
import { Receipt } from "@/components/icons";

export default function NotFound() {
  const t = useT();

  return (
    <StatusScreen
      icon={<Receipt size={28} />}
      title={t("status.notFoundTitle")}
      body={t("status.notFoundBody")}
      actions={<StatusLink href="/">{t("status.home")}</StatusLink>}
    />
  );
}
