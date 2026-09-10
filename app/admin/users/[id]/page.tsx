import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUserDetail } from "@/lib/admin-users";
import AdminUserDetailClient from "./AdminUserDetailClient";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const admin = createAdminClient();
  const user = await getAdminUserDetail(admin, id);
  if (!user) notFound();
  return <AdminUserDetailClient initialUser={user} initialTab={tab} />;
}
