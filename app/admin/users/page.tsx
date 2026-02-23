import { getAdminUsers } from "@/lib/admin-data";
import AdminUsersTable from "./AdminUsersTable";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await getAdminUsers();
  return (
    <div>
      <h1 className="text-2xl font-bold text-mowing-green">Manage users</h1>
      <p className="mt-1 text-mowing-green/80">View users and change roles (buyer, seller, admin).</p>
      <div className="mt-6 rounded-xl border border-par-3-punch/20 bg-white overflow-hidden">
        <AdminUsersTable initialUsers={users} />
      </div>
    </div>
  );
}
