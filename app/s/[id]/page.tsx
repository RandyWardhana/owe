import type { Metadata } from "next";

import { decryptShare } from "@/lib/share";
import { getBillData } from "@/lib/oweDb";
import { shareMeta } from "@/lib/shareMeta";
import App from "@/components/App";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const data = await getBillData(id);
    const bill = data ? await decryptShare(data) : null;
    return shareMeta(bill);
  } catch {
    return shareMeta(null);
  }
}

export default function SharedShortPage() {
  return <App />;
}
