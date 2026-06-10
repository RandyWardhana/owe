import { cookies } from "next/headers";

import { getUserBillsData } from "@/lib/supabaseServer";
import App from "@/components/App";

export default async function Page() {
  const key = (await cookies()).get("owe.k")?.value;
  const backup = key ? await getUserBillsData(key) : null;
  return <App initialBackup={backup} />;
}
