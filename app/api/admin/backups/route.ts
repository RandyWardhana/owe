import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/adminAuth";
import { getBackup, listBackups } from "@/lib/adminDb";
import { backupKey } from "@/lib/adminRestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const code = params.get("code");
  const key = code ? backupKey(code.trim()) : params.get("key");
  if (key) {
    const found = await getBackup(key);
    // Only whether it exists and how big it is. The contents are encrypted with
    // the sync code, which the server has never seen and cannot derive.
    return NextResponse.json({
      key,
      exists: Boolean(found?.backup),
      size: found?.backup?.data?.length ?? 0,
      updatedAt: found?.backup?.updated_at ?? null,
    });
  }

  const rows = await listBackups();
  return NextResponse.json({ backups: rows?.backups ?? [] });
}
