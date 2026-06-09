import type { Metadata } from "next";

import { decryptShare } from "@/lib/share";
import { fetchBill } from "@/lib/bills";
import { shareMeta } from "@/lib/shareMeta";
import App from "@/components/App";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const row = await fetchBill(id);
    const payload = row?.data ? await decryptShare(row.data) : null;
    return shareMeta(payload);
  } catch {
    return shareMeta(null);
  }
}

export default function SharedShortPage() {
  return <App />;
}
