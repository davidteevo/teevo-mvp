import { redirect } from "next/navigation";

/**
 * Legacy simplified sell flow — redirected to the main stepped /sell experience.
 */
export default async function SellStartPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") qs.set(key, value);
    else if (Array.isArray(value) && value[0]) qs.set(key, value[0]);
  }
  const q = qs.toString();
  redirect(q ? `/sell?${q}` : "/sell");
}
