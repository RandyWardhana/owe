import { useStore } from "../store";
import { buzz } from "../util";

export function useStartSplit() {
  const startNew = useStore((s) => s.startNew);
  const applyScan = useStore((s) => s.applyScan);

  const scan = () => {
    buzz(8);
    startNew("scan");
  };

  const manual = () => {
    buzz(8);
    applyScan({ items: [], charges: { taxPct: 0, servicePct: 0, discount: 0 }, source: "manual" });
  };

  return { scan, manual };
}
