import { NextResponse } from "next/server";

import { writeClaim } from "@/lib/oweDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      id?: string;
      item?: string;
      person?: number | null;
      on?: boolean;
    };
    if (!body.id || !body.item) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const person =
      typeof body.person === "number" && body.person >= 0 ? body.person : null;
    return NextResponse.json(
      await writeClaim(body.id, body.item, person, body.on !== false),
    );
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
