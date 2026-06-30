import type { Metadata } from "next";

import { fmtMoney } from "./currency";
import type { SharedBill } from "./types";

const FALLBACK: Metadata = { title: "owe — a shared split" };

export function shareMeta(bill: SharedBill | null): Metadata {
  if (!bill) return FALLBACK;

  const total = fmtMoney(bill.grandTotal, bill.currency);
  const title = bill.title?.trim() || "A shared split";
  const peopleCount = bill.people.length;
  const people = `${peopleCount} ${peopleCount === 1 ? "person" : "people"}`;
  const payer =
    bill.payerIndex >= 0 ? bill.people[bill.payerIndex]?.name?.trim() || "" : "";

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
