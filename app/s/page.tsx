import type { Metadata } from "next";

import { decryptShare } from "@/lib/share";
import { fmtMoney } from "@/lib/currency";
import App from "@/components/App";

type Props = { searchParams: Promise<{ s?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { s } = await searchParams;
  const payload = s ? await decryptShare(s) : null;

  if (!payload) {
    return { title: "owe — a shared split" };
  }

  const total = fmtMoney(payload.g, payload.c);
  const title = payload.t?.trim() || "A shared split";
  const heading = `${title} · ${total}`;
  const people = payload.pp.length;
  const payer = payload.py >= 0 ? payload.pp[payload.py]?.n : "";
  const description = payer
    ? `${total} split between ${people} · paid by ${payer}. Open to see who owes what.`
    : `${total} split between ${people}. Open to see who owes what.`;

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

export default function SharedPage() {
  return <App />;
}
