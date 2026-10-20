import type { Metadata } from "next";

import { decryptShare } from "@/lib/share";
import { shareMeta } from "@/lib/shareMeta";
import App from "@/components/App";
import type { SharePageProps } from "@/entities/props/app";

export async function generateMetadata({ searchParams }: SharePageProps): Promise<Metadata> {
  const { s: encryptedShare } = await searchParams;
  const bill = encryptedShare ? await decryptShare(encryptedShare) : null;
  return shareMeta(bill);
}

export default function SharedPage() {
  return <App />;
}
