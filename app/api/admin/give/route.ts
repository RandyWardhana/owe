import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/adminAuth";
import { getBackup, getBillRow, putBackup, readSharedBill, setOwner } from "@/lib/adminDb";
import type { AdminBillRow } from "@/entities/admin";
import {
  backupKey,
  buildRestore,
  newOwnerToken,
  newSyncCode,
  ownerHashOf,
  readUserPayload,
} from "@/lib/adminRestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const { ids, code, makeOwner } = (await req.json()) as {
    ids?: string[];
    code?: string;
    makeOwner?: boolean;
  };
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ ok: false, error: "Pick at least one bill." }, { status: 400 });
  }

  const rows = (await Promise.all(ids.map((id) => getBillRow(id)))).filter(
    (row): row is AdminBillRow => Boolean(row && readSharedBill(row.data)),
  );
  if (!rows.length) {
    return NextResponse.json({ ok: false, error: "Those bills are no longer on the server, or can't be read." }, { status: 404 });
  }

  const typed = code?.trim();
  const syncCode = typed || newSyncCode();

  let existing = null;
  if (typed) {
    const found = await getBackup(backupKey(syncCode));
    if (found?.backup?.data) {
      existing = readUserPayload(found.backup.data, syncCode);
      if (!existing) {
        return NextResponse.json(
          { ok: false, error: "That sync code has a backup the server can't read. Check the code for typos." },
          { status: 409 },
        );
      }
    }
  }

  const tokens: Record<string, string> = {};
  if (makeOwner) rows.forEach((row) => (tokens[row.id] = newOwnerToken()));

  const built = buildRestore(rows, syncCode, existing, tokens);
  if (!built) {
    return NextResponse.json({ ok: false, error: "None of those bills could be read." }, { status: 422 });
  }

  const written = await putBackup(built.key, built.data, built.billIds);
  if (!written?.ok) {
    return NextResponse.json({ ok: false, error: "Couldn't write the backup. Try again." }, { status: 502 });
  }

  let owned = 0;
  if (makeOwner) {
    const results = await Promise.all(
      Object.entries(tokens).map(([id, token]) => setOwner(id, ownerHashOf(token), built.key)),
    );
    owned = results.filter((result) => result?.ok && result.changed > 0).length;
  }

  return NextResponse.json({
    ok: true,
    code: syncCode,
    created: !typed,
    titles: built.titles,
    kept: existing?.history.length ?? 0,
    owned,
    ownerFailed: Boolean(makeOwner) && owned < Object.keys(tokens).length,
  });
}
