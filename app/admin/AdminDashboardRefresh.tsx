"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Refreshes admin dashboard data when the window gains focus (e.g. user
 * returns to the tab), so counts like "Listings (go live)" update after
 * new listings are added or verified elsewhere.
 */
export function AdminDashboardRefresh() {
  const router = useRouter();
  useEffect(() => {
    const onFocus = () => router.refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [router]);
  return null;
}
