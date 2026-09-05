import { NextResponse } from "next/server";

import { listProofs } from "@/lib/oweDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ proofs: [] });
  return NextResponse.json({ proofs: await listProofs(id) });
}
