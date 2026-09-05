import { NextResponse } from "next/server";

import { readUserBills, writeUserBills } from "@/lib/oweDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!key) return NextResponse.json({ data: null });
  return NextResponse.json(await readUserBills(key));
}

export async function POST(req: Request) {
  try {
    const { key, data } = (await req.json()) as { key?: string; data?: string };
    if (!key || !data) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    return NextResponse.json(await writeUserBills(key, data));
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
