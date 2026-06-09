import type { Metadata } from "next";

import { decryptShare } from "@/lib/share";
import { shareMeta } from "@/lib/shareMeta";
import App from "@/components/App";

type Props = { searchParams: Promise<{ s?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { s } = await searchParams;
  const payload = s ? await decryptShare(s) : null;
  return shareMeta(payload);
}

export default function SharedPage() {
  return <App />;
}
