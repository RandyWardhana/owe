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
    const { key, data, bills, owned, name } = (await req.json()) as {
      key?: string;
      data?: string;
      bills?: unknown;
      owned?: unknown;
      name?: unknown;
    };
    if (!key || !data) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const ids = Array.isArray(bills)
      ? bills.filter((id): id is string => typeof id === "string").slice(0, 1000)
      : undefined;
    const tokens =
      owned && typeof owned === "object" && !Array.isArray(owned)
        ? Object.fromEntries(
            Object.entries(owned as Record<string, unknown>).filter(
              (pair): pair is [string, string] => typeof pair[1] === "string",
            ),
          )
        : undefined;
    return NextResponse.json(
      await writeUserBills(key, data, ids, tokens, typeof name === "string" ? name : undefined),
    );
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
