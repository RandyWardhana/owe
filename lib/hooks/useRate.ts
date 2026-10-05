"use client";

import { useEffect, useState } from "react";

/* The rate that turns an amount in `from` into `to`, for showing a shared bill
   in the viewer's own currency. The last rates fetched are kept per base, so a
   bill opened again offline -- on the plane home, say -- still converts. */

type Stored = { date: string | null; rates: Record<string, number>; at: number };

const FRESH_MS = 6 * 3600 * 1000;
const keyFor = (base: string) => `owe.rates.${base}`;

function readStored(base: string): Stored | null {
  try {
    const raw = localStorage.getItem(keyFor(base));
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

export type RateState =
  | { status: "same" }
  | { status: "loading" }
  | { status: "ready"; rate: number; date: string | null }
  | { status: "failed" };

export function useRate(from: string, to: string | null): RateState {
  const [stored, setStored] = useState<Stored | null>(null);
  const [failed, setFailed] = useState(false);
  const wanted = Boolean(to && to !== from);

  useEffect(() => {
    if (!wanted) return;
    setFailed(false);
    const cached = readStored(from);
    setStored(cached);
    if (cached && Date.now() - cached.at < FRESH_MS) return;

    let live = true;
    fetch(`/api/rates?base=${encodeURIComponent(from)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((body: { date: string | null; rates: Record<string, number> }) => {
        const next = { date: body.date, rates: body.rates, at: Date.now() };
        try {
          localStorage.setItem(keyFor(from), JSON.stringify(next));
        } catch {
          // storage full or blocked: the rates still work for this visit
        }
        if (live) setStored(next);
      })
      .catch(() => {
        // An old rate beats none; only fail when there is nothing at all.
        if (live && !cached) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [from, wanted]);

  if (!wanted) return { status: "same" };
  const rate = to ? stored?.rates[to] : undefined;
  if (rate) return { status: "ready", rate, date: stored?.date ?? null };
  return failed || stored ? { status: "failed" } : { status: "loading" };
}
