import { NextResponse } from "next/server";

import { readBill, removeBill, writeBill } from "@/lib/oweDb";

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
      owner_hash?: string;
      owner_token?: string;
    };
    if (!body.id) return NextResponse.json({ ok: false }, { status: 400 });

    const { ok } = await writeBill(
      {
        id: body.id,
        ...(typeof body.data === "string" ? { data: body.data } : {}),
        ...(Array.isArray(body.paid) ? { paid: body.paid } : {}),
        ...(typeof body.owner_hash === "string" ? { owner_hash: body.owner_hash } : {}),
      },
      body.owner_token,
    );
    return NextResponse.json({ ok });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });

  const { ok, status } = await removeBill(id, url.searchParams.get("t") ?? "");
  return NextResponse.json({ ok }, { status: ok ? 200 : status });
}
