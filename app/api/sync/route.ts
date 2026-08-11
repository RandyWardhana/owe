import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Both rows are keyed by sha256(deviceId) and hold an opaque encrypted blob;
// only the table differs.
const TABLES = {
  bills: "user_bills",
  contacts: "user_contacts",
} as const;

const tableFor = (scope: string | null | undefined): string =>
  scope === "contacts" ? TABLES.contacts : TABLES.bills;

export async function GET(req: Request) {
  const client = supabaseServer();
  if (!client) return NextResponse.json({ data: null });
  const params = new URL(req.url).searchParams;
  const key = params.get("key");
  if (!key) return NextResponse.json({ data: null });
  try {
    const { data, error } = await client
      .from(tableFor(params.get("scope")))
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
    const { key, data, scope } = (await req.json()) as {
      key?: string;
      data?: string;
      scope?: string;
    };
    if (!key || !data) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const { error } = await client
      .from(tableFor(scope))
      .upsert({ key, data, updated_at: new Date().toISOString() });
    return NextResponse.json({ ok: !error });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
