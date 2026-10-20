import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/adminAuth";
import { backupBillIds, deleteBillAdmin, getBillDetail, listBackups, listBills, toSummary } from "@/lib/adminDb";
import type { AdminBillRouteParams } from "@/entities/props/app";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: AdminBillRouteParams) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const { id } = await params;
  const [bill, backups] = await Promise.all([getBillDetail(id), listBackups()]);
  if (!bill) return NextResponse.json({ error: "not found" }, { status: 404 });
  const devices = (backups?.backups ?? [])
    .map((row) => ({
      key: row.key,
      size: row.size,
      updatedAt: row.updated_at,
      billIds: backupBillIds(row),
      name: row.name || null,
    }))
    .filter((device) => device.key === bill.syncKey || device.billIds.includes(id));
  const summaries = devices.length ? (await listBills())?.bills.map(toSummary) ?? [] : [];
  const titles = new Map(summaries.map((summary) => [summary.id, summary.title]));
  return NextResponse.json({
    bill,
    indexed: Boolean(backups?.indexed),
    devices: devices.map((device) => ({
      key: device.key,
      name: device.name,
      updatedAt: device.updatedAt,
      bills: [
        ...new Set([
          ...summaries.filter((summary) => summary.syncKey === device.key).map((summary) => summary.id),
          ...device.billIds,
        ]),
      ]
        .filter((billId) => titles.has(billId))
        .map((billId) => ({ id: billId, title: titles.get(billId) ?? billId })),
    })),
  });
}

export async function DELETE(_req: Request, { params }: AdminBillRouteParams) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const { id } = await params;
  const result = await deleteBillAdmin(id);
  if (!result?.ok) {
    return NextResponse.json(
      { ok: false, error: "The Worker refused the delete. It probably needs redeploying (cd worker && npx wrangler deploy)." },
      { status: 502 },
    );
  }
  return NextResponse.json(result);
}
