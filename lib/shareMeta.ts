import type { Metadata } from "next";

import { fmtMoney } from "./currency";
import type { SharePayload } from "./types";

const FALLBACK: Metadata = { title: "owe — a shared split" };

export function shareMeta(payload: SharePayload | null): Metadata {
  if (!payload) return FALLBACK;

  const total = fmtMoney(payload.g, payload.c);
  const title = payload.t?.trim() || "A shared split";
  const n = payload.pp.length;
  const people = `${n} ${n === 1 ? "person" : "people"}`;
  const payer =
    payload.py >= 0 ? payload.pp[payload.py]?.n?.trim() || "" : "";

  const heading = `${title} · ${total}`;
  const description = payer
    ? `${total} across ${people}, ${payer} paid. Tap to see who owes what.`
    : `${total} across ${people}. Tap to see who owes what.`;

  return {
    title: heading,
    description,
    openGraph: {
      title: heading,
      description,
      type: "website",
      siteName: "owe",
      images: [{ url: "/icon-512x512.png", width: 512, height: 512 }],
    },
    twitter: {
      card: "summary",
      title: heading,
      description,
      images: ["/icon-512x512.png"],
    },
  };
}
