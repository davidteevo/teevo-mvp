"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AvailabilityReconfirmForm } from "@/components/dashboard/AvailabilityReconfirmForm";

export default function DashboardConfirmAvailabilityPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent("/dashboard/listings/confirm")}`);
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <p className="text-mowing-green/80">Loading…</p>;
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold text-mowing-green">Confirm availability</h1>
      <p className="text-sm text-mowing-green/80">
        Confirm availability to make your listing available to buyers.
      </p>
      <AvailabilityReconfirmForm />
    </div>
  );
}
