import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Package, ShoppingCart, Users, TrendingUp, CheckCircle } from "lucide-react";
import { formatPrice } from "@/lib/format";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function AdminDashboardPage() {
  const [
    pendingRes,
    listingsRes,
    txRes,
    gmvRes,
    usersRes,
  ] = await Promise.all([
    admin.from("listings").select("id", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("listings").select("id, status", { count: "exact" }),
    admin.from("transactions").select("id, amount, status", { count: "exact" }),
    admin.from("transactions").select("amount").in("status", ["complete", "shipped"]),
    admin.from("users").select("id, role", { count: "exact" }),
  ]);

  const pendingCount = pendingRes.count ?? 0;
  const totalListings = listingsRes.count ?? 0;
  const verifiedCount = listingsRes.data?.filter((l) => l.status === "verified").length ?? 0;
  const soldCount = listingsRes.data?.filter((l) => l.status === "sold").length ?? 0;
  const txCount = txRes.count ?? 0;
  const gmv = gmvRes.data?.reduce((sum, t) => sum + (t.amount ?? 0), 0) ?? 0;
  const usersCount = usersRes.count ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-mowing-green">Admin dashboard</h1>
      <p className="mt-1 text-mowing-green/80">Approve listings, monitor metrics, manage users.</p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-mowing-green mb-4">Key metrics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-par-3-punch/20 bg-white p-5">
            <div className="flex items-center gap-2 text-mowing-green/70">
              <Package className="h-5 w-5" />
              <span className="text-sm font-medium">Pending listings</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-mowing-green">{pendingCount}</p>
            <Link href="/admin/listings" className="mt-2 inline-block text-sm text-par-3-punch hover:underline">
              Review & approve →
            </Link>
          </div>
          <div className="rounded-xl border border-par-3-punch/20 bg-white p-5">
            <div className="flex items-center gap-2 text-mowing-green/70">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Verified / Total listings</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-mowing-green">{verifiedCount} / {totalListings}</p>
            <p className="mt-1 text-xs text-mowing-green/60">Sold: {soldCount}</p>
          </div>
          <div className="rounded-xl border border-par-3-punch/20 bg-white p-5">
            <div className="flex items-center gap-2 text-mowing-green/70">
              <ShoppingCart className="h-5 w-5" />
              <span className="text-sm font-medium">Transactions</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-mowing-green">{txCount}</p>
            <Link href="/admin/transactions" className="mt-2 inline-block text-sm text-par-3-punch hover:underline">
              View all →
            </Link>
          </div>
          <div className="rounded-xl border border-par-3-punch/20 bg-white p-5">
            <div className="flex items-center gap-2 text-mowing-green/70">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm font-medium">GMV (complete/shipped)</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-mowing-green">{formatPrice(gmv)}</p>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-mowing-green mb-4">Quick actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/admin/listings"
            className="rounded-xl border border-par-3-punch/20 bg-white p-6 hover:shadow-md transition-shadow flex items-start gap-4"
          >
            <div className="rounded-lg bg-golden-tee/20 p-3">
              <Package className="h-6 w-6 text-mowing-green" />
            </div>
            <div>
              <p className="font-semibold text-mowing-green">Approve listings</p>
              <p className="text-sm text-mowing-green/70 mt-0.5">{pendingCount} pending</p>
            </div>
          </Link>
          <Link
            href="/admin/transactions"
            className="rounded-xl border border-par-3-punch/20 bg-white p-6 hover:shadow-md transition-shadow flex items-start gap-4"
          >
            <div className="rounded-lg bg-par-3-punch/20 p-3">
              <ShoppingCart className="h-6 w-6 text-mowing-green" />
            </div>
            <div>
              <p className="font-semibold text-mowing-green">Transactions</p>
              <p className="text-sm text-mowing-green/70 mt-0.5">Monitor sales & status</p>
            </div>
          </Link>
          <Link
            href="/admin/users"
            className="rounded-xl border border-par-3-punch/20 bg-white p-6 hover:shadow-md transition-shadow flex items-start gap-4"
          >
            <div className="rounded-lg bg-mowing-green/10 p-3">
              <Users className="h-6 w-6 text-mowing-green" />
            </div>
            <div>
              <p className="font-semibold text-mowing-green">Manage users</p>
              <p className="text-sm text-mowing-green/70 mt-0.5">{usersCount} users</p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
