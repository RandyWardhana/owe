import { NextResponse } from "next/server";

import { CURRENCIES } from "@/lib/currency";

export const runtime = "nodejs";

/* Daily rates from fawazahmed0/exchange-api: free, keyless, and covers every
   currency we offer -- TWD included, which the ECB-based feeds lack. It is
   published on npm and served by jsDelivr, with a Cloudflare Pages mirror for
   when the CDN misbehaves. Proxied here so the source can change without a
   client release, and so one fetch serves everyone for a few hours. */
const SOURCES = [
  (base: string) =>
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${base}.json`,
  (base: string) => `https://latest.currency-api.pages.dev/v1/currencies/${base}.json`,
];

const HOURS = 6;

export async function GET(req: Request) {
  const base = (new URL(req.url).searchParams.get("base") || "").toUpperCase();
  if (!CURRENCIES[base]) return NextResponse.json({ error: "base" }, { status: 400 });

  const key = base.toLowerCase();
  for (const source of SOURCES) {
    try {
      const res = await fetch(source(key), { next: { revalidate: HOURS * 3600 } });
      if (!res.ok) continue;
      const body = (await res.json()) as { date?: string } & Record<string, unknown>;
      const all = body[key] as Record<string, number> | undefined;
      if (!all) continue;
      const rates: Record<string, number> = {};
      for (const code of Object.keys(CURRENCIES)) {
        const rate = code === base ? 1 : all[code.toLowerCase()];
        if (typeof rate === "number" && rate > 0) rates[code] = rate;
      }
      return NextResponse.json(
        { base, date: body.date ?? null, rates },
        { headers: { "Cache-Control": `public, s-maxage=${HOURS * 3600}, stale-while-revalidate=86400` } },
      );
    } catch {
      // try the next source
    }
  }
  return NextResponse.json({ error: "unavailable" }, { status: 502 });
}
