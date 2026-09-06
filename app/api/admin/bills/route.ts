import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/adminAuth";
import { listBills, toView } from "@/lib/adminDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const rows = await listBills();
  return NextResponse.json({ bills: (rows?.bills ?? []).map(toView) });
}
