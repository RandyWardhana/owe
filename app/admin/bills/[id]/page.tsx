import { adminConfigured } from "@/lib/adminAuth";
import { adminReady } from "@/lib/adminDb";

import AdminBill from "@/components/admin/AdminBill";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "owe · admin · bill", robots: { index: false, follow: false } };

export default async function AdminBillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!adminConfigured() || !adminReady()) {
    return (
      <div className="adm-gate">
        <div className="adm-notice adm-notice--bad">
          Admin is off. Set <code>ADMIN_PASSWORD</code> (8+ characters), <code>OWE_DB_URL</code> and{" "}
          <code>OWE_DB_SECRET</code>, then restart.
        </div>
      </div>
    );
  }
  return <AdminBill id={decodeURIComponent(id)} />;
}
