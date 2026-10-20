const DEFAULT_INTERVAL = 5000;

const visible = (): boolean =>
  typeof document === "undefined" || document.visibilityState !== "hidden";

const online = (): boolean =>
  typeof navigator === "undefined" || navigator.onLine;

export function pollWhileVisible(
  tick: () => void,
  interval = DEFAULT_INTERVAL,
): () => void {
  let stopped = false;

  const run = () => {
    if (stopped || !visible() || !online()) return;
    tick();
  };

  const timer = setInterval(run, interval);
  run();

  const wake = () => run();
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", wake);
  }
  if (typeof window !== "undefined") {
    window.addEventListener("online", wake);
  }

  return () => {
    stopped = true;
    clearInterval(timer);
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", wake);
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("online", wake);
    }
  };
}
