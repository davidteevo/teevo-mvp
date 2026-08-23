import { getAdminUsers } from "@/lib/admin-data";
import AdminUsersTable from "./AdminUsersTable";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }> | { q?: string };
}) {
  const started = Date.now();
  let users;
  try {
    users = await getAdminUsers();
  } catch (err) {
    // #region agent log
    fetch("http://127.0.0.1:7581/ingest/4c9de01a-e4bd-4cc4-acce-f5ab7832ce40", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f61061" },
      body: JSON.stringify({
        sessionId: "f61061",
        hypothesisId: "A",
        location: "app/admin/users/page.tsx:getAdminUsers",
        message: "getAdminUsers threw",
        data: {
          err: String(err),
          stack: err instanceof Error ? err.stack?.slice(0, 1500) : null,
          ms: Date.now() - started,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    throw err;
  }
  const params = await searchParams;
  const q = params && typeof params === "object" ? (params as { q?: unknown }).q : undefined;
  // #region agent log
  fetch("http://127.0.0.1:7581/ingest/4c9de01a-e4bd-4cc4-acce-f5ab7832ce40", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f61061" },
    body: JSON.stringify({
      sessionId: "f61061",
      hypothesisId: "A,B",
      location: "app/admin/users/page.tsx:render",
      message: "AdminUsersPage ok",
      data: {
        userCount: users.length,
        ms: Date.now() - started,
        qType: Array.isArray(q) ? "array" : typeof q,
        qIsArray: Array.isArray(q),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  return (
    <div>
      <h1 className="text-2xl font-bold text-mowing-green">Manage users</h1>
      <p className="mt-1 text-mowing-green/80">View users and change roles (buyer, seller, admin).</p>
      <div className="mt-6 rounded-xl border border-par-3-punch/20 bg-white overflow-hidden">
        <AdminUsersTable initialUsers={users} initialQuery={params.q ?? ""} />
      </div>
    </div>
  );
}
