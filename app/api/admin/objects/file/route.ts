import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/adminAuth";
import { fetchObject, fetchProofFile, locateKey } from "@/lib/adminDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const params = new URL(req.url).searchParams;
  const key = params.get("key");
  const id = params.get("id");
  const index = Number(params.get("i"));
  let upstream: Response | null = null;
  if (key) upstream = await fetchObject(key);
  const target = id && Number.isInteger(index) ? { billId: id, personIndex: index } : key ? locateKey(key) : null;
  if (!upstream && target) upstream = await fetchProofFile(target.billId, target.personIndex);
  if (!upstream?.body) return NextResponse.json({ error: "not found" }, { status: 404 });
  return new Response(upstream.body, {
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "cache-control": "private, max-age=300",
    },
  });
}
