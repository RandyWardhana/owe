import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/adminAuth";
import { backupBillIds, deleteBackup, getBackup, indexBackup, listBackups } from "@/lib/adminDb";
import { backupKey, readUserPayload, summarizeUserPayload } from "@/lib/adminRestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const code = new URL(req.url).searchParams.get("code")?.trim();
  if (code) {
    const found = await getBackup(backupKey(code));
    const data = found?.backup?.data;
    if (!data) return NextResponse.json({ exists: false });
    const payload = readUserPayload(data, code);
    const summary = payload ? summarizeUserPayload(payload) : null;
    const billIds = [...new Set((summary?.bills ?? []).map((b) => b.shareId).filter((id): id is string => Boolean(id)))];
    const linked = summary ? Boolean((await indexBackup(backupKey(code), billIds))?.ok) : false;
    return NextResponse.json({
      exists: true,
      readable: Boolean(payload),
      size: data.length,
      updatedAt: found?.backup?.updated_at ?? null,
      summary,
      linked,
    });
  }

  const rows = await listBackups();
  return NextResponse.json({
    indexed: Boolean(rows?.indexed),
    backups: (rows?.backups ?? []).map((row) => ({
      key: row.key,
      size: row.size,
      updatedAt: row.updated_at,
      billIds: backupBillIds(row),
      name: row.name || null,
    })),
  });
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const key = new URL(req.url).searchParams.get("key")?.trim();
  if (!key) return NextResponse.json({ ok: false }, { status: 400 });
  const result = await deleteBackup(key);
  if (!result?.ok) {
    return NextResponse.json(
      { ok: false, error: "The Worker refused the delete. It probably needs redeploying (cd worker && npx wrangler deploy)." },
      { status: 502 },
    );
  }
  return NextResponse.json(result);
}
