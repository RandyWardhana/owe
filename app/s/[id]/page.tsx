import type { Metadata } from "next";

import { decryptShare } from "@/lib/share";
import { getBillData } from "@/lib/supabaseServer";
import { shareMeta } from "@/lib/shareMeta";
import App from "@/components/App";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const data = await getBillData(id);
    const payload = data ? await decryptShare(data) : null;
    return shareMeta(payload);
  } catch {
    return shareMeta(null);
  }
}

export default function SharedShortPage() {
  return <App />;
}
