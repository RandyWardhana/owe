import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE = "user_bills";

export async function GET(req: Request) {
  const client = supabaseServer();
  if (!client) return NextResponse.json({ data: null });
  const key = new URL(req.url).searchParams.get("key");
  if (!key) return NextResponse.json({ data: null });
  try {
    const { data, error } = await client
      .from(TABLE)
      .select("data")
      .eq("key", key)
      .maybeSingle();
    if (error || !data) return NextResponse.json({ data: null });
    return NextResponse.json({ data: data.data ?? null });
  } catch {
    return NextResponse.json({ data: null });
  }
}

export async function POST(req: Request) {
  const client = supabaseServer();
  if (!client) return NextResponse.json({ ok: false });
  try {
    const { key, data } = (await req.json()) as { key?: string; data?: string };
    if (!key || !data) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const { error } = await client
      .from(TABLE)
      .upsert({ key, data, updated_at: new Date().toISOString() });
    return NextResponse.json({ ok: !error });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
