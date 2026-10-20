import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/adminAuth";
import { getBackup, listBills, setOwner } from "@/lib/adminDb";
import { backupKey, ownerHashOf, readUserPayload } from "@/lib/adminRestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const { code } = (await req.json()) as { code?: string };
  const syncCode = code?.trim();
  if (!syncCode) return NextResponse.json({ ok: false, error: "Paste the sync code first." }, { status: 400 });

  const found = await getBackup(backupKey(syncCode));
  const payload = found?.backup?.data ? readUserPayload(found.backup.data, syncCode) : null;
  if (!payload) {
    return NextResponse.json({ ok: false, error: "That sync code has no backup this server can open." }, { status: 404 });
  }

  const all = await listBills();
  const unowned = new Set((all?.bills ?? []).filter((b) => Number(b.owned) !== 1).map((b) => b.id));
  const owners = payload.owners ?? {};
  const targets = Object.entries(owners).filter(([id]) => unowned.has(id));

  const results = await Promise.all(targets.map(([id, token]) => setOwner(id, ownerHashOf(token), backupKey(syncCode))));
  const fixed = results.filter((r) => r?.ok && r.changed > 0).length;

  return NextResponse.json({
    ok: true,
    fixed,
    tried: targets.length,
    workerOutdated: targets.length > 0 && fixed === 0 && results.every((r) => !r),
  });
}
