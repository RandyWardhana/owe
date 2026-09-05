import { NextResponse } from "next/server";

import { readBill, writeBill } from "@/lib/oweDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ data: null, paid: [] });
  return NextResponse.json(await readBill(id));
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      id?: string;
      data?: string;
      paid?: number[];
    };
    if (!body.id) return NextResponse.json({ ok: false }, { status: 400 });

    const { ok } = await writeBill({
      id: body.id,
      ...(typeof body.data === "string" ? { data: body.data } : {}),
      ...(Array.isArray(body.paid) ? { paid: body.paid } : {}),
    });
    return NextResponse.json({ ok });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
