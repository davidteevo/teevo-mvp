import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LegacyAdminPackagingPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }> | { id?: string };
}) {
  const params = await searchParams;
  const id = params.id;
  redirect(id ? `/admin/packaging?id=${encodeURIComponent(id)}` : "/admin/packaging");
}
