import { useEffect, useState } from "react";

import type { SplashPhase } from "../../entities/appearance";

const MINIMUM_MS = 1000;
const FADE_MS = 350;

// Timed from navigation start, so a slow load does not stack an extra second on top.
export function useSplash(): SplashPhase {
  const [phase, setPhase] = useState<SplashPhase>("show");

  useEffect(() => {
    const wait = Math.max(0, MINIMUM_MS - performance.now());
    const leave = setTimeout(() => setPhase("leaving"), wait);
    const gone = setTimeout(() => setPhase("gone"), wait + FADE_MS);
    return () => {
      clearTimeout(leave);
      clearTimeout(gone);
    };
  }, []);

  return phase;
}
