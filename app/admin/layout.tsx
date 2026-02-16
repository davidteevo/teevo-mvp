import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/admin");
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-off-white-pique">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <nav className="flex flex-wrap gap-4 mb-6 border-b border-par-3-punch/20 pb-4">
          <Link href="/admin" className="text-mowing-green font-medium hover:underline">
            Overview
          </Link>
          <Link href="/admin/listings" className="text-mowing-green font-medium hover:underline">
            Pending listings
          </Link>
          <Link href="/admin/transactions" className="text-mowing-green font-medium hover:underline">
            Transactions
          </Link>
          <Link href="/admin/users" className="text-mowing-green font-medium hover:underline">
            Users
          </Link>
        </nav>
        {children}
      </div>
    </div>
  );
}
