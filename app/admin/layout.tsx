import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { generateDisplayNameFromFirstName } from "@/lib/public-seller-name";
import { AdminNav } from "./_components/AdminNav";

export const dynamic = "force-dynamic";

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
  let { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
  // If no profile row (e.g. auth callback didn't run), create one so we don't redirect forever
  if (!profile) {
    await admin.from("users").insert({
      id: user.id,
      email: user.email ?? "",
      role: "buyer",
      display_name: generateDisplayNameFromFirstName(null),
      updated_at: new Date().toISOString(),
    });
    profile = (await admin.from("users").select("role").eq("id", user.id).single()).data ?? null;
  }
  if (profile?.role !== "admin") {
    redirect("/login?redirect=/admin");
  }

  return (
    <div className="min-h-screen bg-off-white-pique">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <AdminNav />
        {children}
      </div>
    </div>
  );
}
