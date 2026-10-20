import type { Metadata } from "next";

import { decryptShare } from "@/lib/share";
import { getBillData } from "@/lib/oweDb";
import { shareMeta } from "@/lib/shareMeta";
import App from "@/components/App";
import type { SharedBillPageProps } from "@/entities/props/app";

export async function generateMetadata({ params }: SharedBillPageProps): Promise<Metadata> {
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
