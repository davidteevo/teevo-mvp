"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function RedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const edited = searchParams.get("edited");
    const query = edited === "1" ? "?edited=1" : "";
    router.replace(`/dashboard${query}`);
  }, [router, searchParams]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-center text-mowing-green/80">
      Redirecting to dashboard…
    </div>
  );
}

export default function SellerDashboardPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-12 text-center text-mowing-green/80">Loading…</div>}>
      <RedirectContent />
    </Suspense>
  );
}
