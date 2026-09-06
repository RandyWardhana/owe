import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/adminAuth";
import { getBackup, listBills, putBackup } from "@/lib/adminDb";
import { backupKey, buildRestore, newSyncCode, readUserPayload } from "@/lib/adminRestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const { ids, code } = (await req.json()) as { ids?: string[]; code?: string };
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ ok: false, error: "pick at least one bill" }, { status: 400 });
  }

  const all = await listBills();
  const rows = (all?.bills ?? []).filter((b) => ids.includes(b.id));
  if (!rows.length) return NextResponse.json({ ok: false, error: "no such bills" }, { status: 404 });

  const syncCode = code?.trim() || newSyncCode();

  /* Writing over a code the user already syncs would drop every bill it holds,
     so merge into whatever is stored there first. */
  let existing = null;
  let kept = 0;
  if (code?.trim()) {
    const found = await getBackup(backupKey(syncCode));
    if (found?.backup?.data) {
      existing = readUserPayload(found.backup.data, syncCode);
      if (!existing) {
        return NextResponse.json(
          { ok: false, error: "that code already has a backup this server cannot read" },
          { status: 409 },
        );
      }
      kept = existing.history.length;
    }
  }

  const built = buildRestore(rows, syncCode, existing);
  if (!built) {
    return NextResponse.json({ ok: false, error: "none of those bills could be read" }, { status: 422 });
  }

  const written = await putBackup(built.key, built.data);
  if (!written?.ok) return NextResponse.json({ ok: false, error: "write failed" }, { status: 502 });

  return NextResponse.json({ ok: true, code: syncCode, titles: built.titles, kept });
}
