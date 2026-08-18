import { createAdminClient } from "@/lib/supabase/admin";
import { AdminDashboardRefresh } from "./AdminDashboardRefresh";
import { AdminOverviewClient } from "./_components/AdminOverviewClient";
import {
  getAdminActionCentre,
  getAdminBusinessMetrics,
  getAdminExceptions,
} from "@/lib/admin-action-centre-data";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const admin = createAdminClient();
  const [centre, metrics, exceptions] = await Promise.all([
    getAdminActionCentre(admin),
    getAdminBusinessMetrics(admin),
    getAdminExceptions(admin),
  ]);

  return (
    <div>
      <AdminDashboardRefresh />
      <AdminOverviewClient initialCentre={centre} initialExceptions={exceptions} metrics={metrics} />
    </div>
  );
}
