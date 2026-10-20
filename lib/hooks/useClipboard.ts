import { useCallback } from "react";

import { useStore } from "../store";
import { buzz } from "../util";

export function useClipboard() {
  const showToast = useStore((s) => s.showToast);

  return useCallback(
    async (text: string) => {
      await navigator.clipboard.writeText(text).catch(() => {});
      buzz(10);
      showToast("common.copied");
    },
    [showToast],
  );
}
