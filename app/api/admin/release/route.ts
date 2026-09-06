import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/adminAuth";
import { releaseBill } from "@/lib/adminDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const { id } = (await req.json()) as { id?: string };
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  const out = await releaseBill(id);
  return NextResponse.json({ ok: Boolean(out?.ok), changed: out?.changed ?? 0 });
}
