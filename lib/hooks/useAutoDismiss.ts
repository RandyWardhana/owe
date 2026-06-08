import { useEffect } from "react";

export function useAutoDismiss(
  trigger: unknown,
  onDismiss: () => void,
  ms = 2200,
): void {
  useEffect(() => {
    if (!trigger) return;
    const id = setTimeout(onDismiss, ms);
    return () => clearTimeout(id);
  }, [trigger, onDismiss, ms]);
}
