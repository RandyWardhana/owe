"use client";

import { useEffect, useState } from "react";

import type { RateState, StoredRate } from "../../entities/currency";

// The last rates fetched are kept per base so a bill reopened offline still converts.

const FRESH_MS = 6 * 3600 * 1000;
const keyFor = (base: string) => `owe.rates.${base}`;

function readStored(base: string): StoredRate | null {
  try {
    const raw = localStorage.getItem(keyFor(base));
    return raw ? (JSON.parse(raw) as StoredRate) : null;
  } catch {
    return null;
  }
}

export function useRate(from: string, to: string | null): RateState {
  const [stored, setStored] = useState<StoredRate | null>(null);
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
          // Storage full or blocked: the rates still work for this visit.
        }
        if (live) setStored(next);
      })
      .catch(() => {
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
