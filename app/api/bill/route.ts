import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE = "bills";

export async function GET(req: Request) {
  const client = supabaseServer();
  if (!client) return NextResponse.json({ data: null, paid: [] });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ data: null, paid: [] });
  try {
    const { data, error } = await client
      .from(TABLE)
      .select("data, paid")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return NextResponse.json({ data: null, paid: [] });
    return NextResponse.json({
      data: (data.data as string) ?? null,
      paid: Array.isArray(data.paid) ? data.paid : [],
    });
  } catch {
    return NextResponse.json({ data: null, paid: [] });
  }
}

export async function POST(req: Request) {
  const client = supabaseServer();
  if (!client) return NextResponse.json({ ok: false });
  try {
    const body = (await req.json()) as {
      id?: string;
      data?: string;
      paid?: number[];
    };
    if (!body.id) return NextResponse.json({ ok: false }, { status: 400 });
    const row: Record<string, unknown> = {
      id: body.id,
      updated_at: new Date().toISOString(),
    };
    if (typeof body.data === "string") row.data = body.data;
    if (Array.isArray(body.paid)) row.paid = body.paid;
    const { error } = await client.from(TABLE).upsert(row);
    return NextResponse.json({ ok: !error });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
