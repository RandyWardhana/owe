import { adminConfigured } from "@/lib/adminAuth";
import { adminReady } from "@/lib/adminDb";

import AdminConsole from "@/components/admin/AdminConsole";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "owe · admin", robots: { index: false, follow: false } };

export default function AdminPage() {
  if (!adminConfigured() || !adminReady()) {
    return (
      <div className="adm-gate">
        <div className="adm-notice adm-notice--bad">
          Admin is off. Set <code>ADMIN_PASSWORD</code> (8+ characters),{" "}
          <code>OWE_DB_URL</code> and <code>OWE_DB_SECRET</code>, then restart.
        </div>
      </div>
    );
  }
  return <AdminConsole />;
}
