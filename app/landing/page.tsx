import type { Metadata } from "next";
import Landing from "@/components/landing/Landing";

export const metadata: Metadata = {
  title: "owe — scan a receipt, split it, settle up",
  description:
    "The offline-first way to split a bill. Scan the receipt, tap who had what, and share everyone their share. No account, and your bills stay on your phone unless you share them.",
  openGraph: {
    title: "owe — scan a receipt, split it, settle up",
    description:
      "The offline-first way to split a bill. Scan, split, settle — no account, no drama.",
  },
};

export default function LandingRoute() {
  return <Landing />;
}
