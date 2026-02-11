import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function AdminPage() {
  const [pendingRes, txRes] = await Promise.all([
    admin.from("listings").select("id", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("transactions").select("id", { count: "exact", head: true }),
  ]);
  const pendingCount = pendingRes.count ?? 0;
  const txCount = txRes.count ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-mowing-green">Admin</h1>
      <p className="mt-1 text-mowing-green/80">Manual verification and oversight.</p>
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/admin/listings"
          className="rounded-xl border border-par-3-punch/20 bg-white p-6 hover:shadow-md transition-shadow"
        >
          <p className="text-3xl font-bold text-mowing-green">{pendingCount}</p>
          <p className="mt-1 text-mowing-green/80">Pending listings</p>
          <p className="mt-2 text-sm text-par-3-punch">Review & approve →</p>
        </Link>
        <Link
          href="/admin/transactions"
          className="rounded-xl border border-par-3-punch/20 bg-white p-6 hover:shadow-md transition-shadow"
        >
          <p className="text-3xl font-bold text-mowing-green">{txCount}</p>
          <p className="mt-1 text-mowing-green/80">Transactions</p>
          <p className="mt-2 text-sm text-par-3-punch">View all →</p>
        </Link>
      </div>
    </div>
  );
}
