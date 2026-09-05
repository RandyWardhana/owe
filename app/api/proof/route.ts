import { NextResponse } from "next/server";

import { readProof, removeProof, writeProof } from "@/lib/oweDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;

const TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export async function POST(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const index = Number(url.searchParams.get("i"));
  if (!id || !Number.isInteger(index) || index < 0) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const type = req.headers.get("content-type") ?? "";
  if (!TYPES.has(type)) return NextResponse.json({ ok: false }, { status: 415 });

  const body = await req.arrayBuffer();
  if (!body.byteLength) return NextResponse.json({ ok: false }, { status: 400 });
  if (body.byteLength > MAX_BYTES) {
    return NextResponse.json({ ok: false }, { status: 413 });
  }

  const name = url.searchParams.get("name") ?? "";
  return NextResponse.json(await writeProof(id, index, body, type, name));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const index = Number(url.searchParams.get("i"));
  // The owner token rides in the query rather than a header so the image can be
  // used as a plain <img src>. It never leaves this origin: the route swaps it
  // for the server-only shared secret before calling the Worker.
  const token = url.searchParams.get("t") ?? "";
  if (!id || !Number.isInteger(index)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const proof = await readProof(id, index, token);
  if (!proof) return NextResponse.json({ error: "not found" }, { status: 404 });

  return new NextResponse(proof.body, {
    status: 200,
    headers: {
      "content-type": proof.contentType,
      "cache-control": "private, max-age=60",
    },
  });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const index = Number(url.searchParams.get("i"));
  if (!id || !Number.isInteger(index) || index < 0) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { ok, status } = await removeProof(id, index, url.searchParams.get("t") ?? "");
  return NextResponse.json({ ok }, { status: ok ? 200 : status });
}
