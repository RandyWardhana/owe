import { cache } from "react";
import type { Metadata } from "next";

import { decryptShare } from "@/lib/share";
import { getBillData } from "@/lib/supabaseServer";
import { shareMeta } from "@/lib/shareMeta";
import App from "@/components/App";

type Props = { params: Promise<{ id: string }> };

// cached per request so metadata + page share a single server fetch
const billData = cache(getBillData);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const data = await billData(id);
    const payload = data ? await decryptShare(data) : null;
    return shareMeta(payload);
  } catch {
    return shareMeta(null);
  }
}

export default async function SharedShortPage({ params }: Props) {
  const { id } = await params;
  const data = await billData(id);
  return <App initialShared={data} />;
}
