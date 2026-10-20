/* Firebase Analytics for owe, and the error reporting that stands in for
   Crashlytics (which has no web SDK).

   What is sent is USAGE, never a bill: screen names, which button, how a bill
   was started, rough sizes ("4-6 items"). Never item names, people's names,
   amounts, payment numbers, share links or receipt text. Params go through
   `clean` below, which only lets short, known-shape values through, so a
   careless call site cannot leak more than that.

   Built so it can never cost the app anything:
   - Firebase loads lazily (dynamic import) once the page is idle, so it is
     not in the first-paint bundle and an offline launch is not held up.
   - Calls before it is ready are queued (capped) and flushed once it is.
   - Every failure -- blocked by an ad blocker, unsupported browser, no
     network -- ends in a no-op sender, never a thrown error.
   - Development builds never send, so local testing does not pollute the
     numbers; set NEXT_PUBLIC_ANALYTICS_DEBUG=1 to send from dev anyway.

   The Firebase web config comes from NEXT_PUBLIC_FIREBASE_* (see
   .env.local.example). Those values are inlined at build time, which is why
   each is read by its full name below -- `process.env[name]` would be empty
   in the browser. If any is missing, analytics simply stays off. */

type Value = string | number | boolean;
export type Params = Record<string, Value | undefined>;

const FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const configured = Object.values(FIREBASE_CONFIG).every(Boolean);

const QUEUE_LIMIT = 60;

let send: ((name: string, params: Record<string, Value>) => void) | null = null;
let queue: [string, Record<string, Value>][] = [];
let started = false;

/* Only short strings, finite numbers and booleans; long strings are cut and
   any run of 4+ digits is masked, so an amount or a phone number that slips
   into a message cannot leave as data. */
function clean(params?: Params): Record<string, Value> {
  const out: Record<string, Value> = {};
  if (!params) return out;
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (typeof value === "number") {
      if (Number.isFinite(value)) out[key] = value;
    } else if (typeof value === "boolean") {
      out[key] = value;
    } else {
      out[key] = value.replace(/\d{4,}/g, "#").slice(0, 100);
    }
  }
  return out;
}

/** "3" -> "1-3", for sizes that are useful as a shape but not as an exact count. */
export function bucket(n: number): string {
  if (n <= 0) return "0";
  if (n <= 3) return "1-3";
  if (n <= 6) return "4-6";
  if (n <= 10) return "7-10";
  if (n <= 20) return "11-20";
  return "21+";
}

export function track(name: string, params?: Params): void {
  if (typeof window === "undefined") return;
  const payload = clean(params);
  if (send) {
    send(name, payload);
  } else if (queue.length < QUEUE_LIMIT) {
    queue.push([name, payload]);
  }
}

function drain(sender: (name: string, params: Record<string, Value>) => void): void {
  send = sender;
  const pending = queue;
  queue = [];
  pending.forEach(([name, params]) => sender(name, params));
}

const noop = () => {};

export async function startAnalytics(): Promise<void> {
  if (started || typeof window === "undefined") return;
  started = true;

  const debug = process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === "1";
  if (!configured || (process.env.NODE_ENV !== "production" && !debug)) {
    drain(noop);
    return;
  }

  try {
    const [{ initializeApp, getApps }, analytics] = await Promise.all([
      import("firebase/app"),
      import("firebase/analytics"),
    ]);
    if (!(await analytics.isSupported())) {
      drain(noop);
      return;
    }
    const app = getApps()[0] ?? initializeApp(FIREBASE_CONFIG);
    // No Google signals and no ad personalisation: owe uses analytics to see
    // how the app is used, not to profile anyone.
    const instance = analytics.initializeAnalytics(app, {
      config: {
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      },
    });
    drain((name, params) => {
      try {
        analytics.logEvent(instance, name, params);
      } catch {
        // Never let a reporting call surface as an app error.
      }
    });
  } catch {
    // Blocked, offline, or failed to load: analytics is off for this visit.
    drain(noop);
  }
}

/* Crashlytics' job on the web: uncaught errors and rejected promises are sent
   as GA4 `exception` events (they show up under Events, and can be turned
   into a report). One of each message per visit, at most ten in all, so a
   loop that throws on every frame cannot flood anything. */
let reportingInstalled = false;

export function installErrorReporting(): void {
  if (reportingInstalled || typeof window === "undefined") return;
  reportingInstalled = true;

  const seen = new Set<string>();
  const report = (description: string, fatal: boolean) => {
    const key = description.slice(0, 100);
    if (seen.has(key) || seen.size >= 10) return;
    seen.add(key);
    track("exception", { description: key, fatal, path: window.location.pathname.split("/")[1] || "home" });
  };

  window.addEventListener("error", (e) => {
    // Resource load failures (an <img> 404) arrive here too, without a message.
    if (!e.message) return;
    report(`${e.message} @ ${(e.filename || "").split("/").pop() || "?"}:${e.lineno || 0}`, true);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason instanceof Error ? e.reason.message : String(e.reason ?? "unknown");
    report(`unhandled: ${reason}`, false);
  });
}
