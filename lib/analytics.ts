import { deviceId, syncName } from "./device";
import type { AnalyticsParams, AnalyticsValue } from "../entities/analytics";

// Sends usage only, never bill content (names, amounts, payment numbers, links, receipt text);
// every param goes through `clean`. Dev builds never send unless NEXT_PUBLIC_ANALYTICS_DEBUG=1.
// The one exception is `device`: the sync name and sync code, so a report can be traced to a
// phone. The code unlocks that phone's backup, so access to the analytics is access to backups.

// NEXT_PUBLIC_* values are inlined at build time, so each must be read by its full name;
// `process.env[name]` would be empty in the browser.
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
const PARAM_LIMIT = 100;
const NO_NAME = "no name";

const noop = () => {};

let send: ((name: string, params: Record<string, AnalyticsValue>) => void) | null = null;
let queue: [string, Record<string, AnalyticsValue>][] = [];
let started = false;
let reportingInstalled = false;

// Runs of 4+ digits are masked so an amount or phone number in a message cannot leave as data.
function clean(params?: AnalyticsParams): Record<string, AnalyticsValue> {
  const out: Record<string, AnalyticsValue> = {};
  if (!params) return out;
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (typeof value === "number") {
      if (Number.isFinite(value)) out[key] = value;
    } else if (typeof value === "boolean") {
      out[key] = value;
    } else {
      out[key] = value.replace(/\d{4,}/g, "#").slice(0, PARAM_LIMIT);
    }
  }
  return out;
}

function drain(sender: (name: string, params: Record<string, AnalyticsValue>) => void): void {
  send = sender;
  const pending = queue;
  queue = [];
  pending.forEach(([name, params]) => sender(name, params));
}

/** "3" -> "1-3", for sizes that are useful as a shape but not as an exact count. */
export function bucket(count: number): string {
  if (count <= 0) return "0";
  if (count <= 3) return "1-3";
  if (count <= 6) return "4-6";
  if (count <= 10) return "7-10";
  if (count <= 20) return "11-20";
  return "21+";
}

// Added after `clean`, which would mask the digit runs in a sync code.
function deviceLabel(): string {
  return `${syncName() || NO_NAME} - ${deviceId()}`.slice(0, PARAM_LIMIT);
}

export function track(name: string, params?: AnalyticsParams): void {
  if (typeof window === "undefined") return;
  const payload = { ...clean(params), device: deviceLabel() };
  if (send) {
    send(name, payload);
  } else if (queue.length < QUEUE_LIMIT) {
    queue.push([name, payload]);
  }
}

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
    // Usage insight only, never profiling.
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
      }
    });
  } catch {
    drain(noop);
  }
}

// Stands in for Crashlytics (no web SDK) via GA4 `exception` events. One of each message per
// visit, ten at most, so a loop that throws every frame cannot flood anything.
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
