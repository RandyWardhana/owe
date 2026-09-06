import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/adminAuth";
import { deleteObject, listObjects } from "@/lib/adminDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const prefix = new URL(req.url).searchParams.get("prefix") ?? "";
  const out = await listObjects(prefix);
  return NextResponse.json({ objects: out?.objects ?? [] });
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const key = new URL(req.url).searchParams.get("key");
  if (!key) return NextResponse.json({ ok: false }, { status: 400 });
  const out = await deleteObject(key);
  return NextResponse.json({ ok: Boolean(out?.ok) });
}
