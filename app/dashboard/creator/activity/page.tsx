"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import type { CreatorHubPayload } from "@/lib/creator/hub";
import { CreatorActivityFeed } from "@/components/creator/CreatorActivityFeed";

export default function CreatorActivityPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [hub, setHub] = useState<CreatorHubPayload | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent("/dashboard/creator/activity")}`);
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/creator/me")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          router.replace("/dashboard");
          return;
        }
        setHub(data as CreatorHubPayload);
      })
      .catch(() => router.replace("/dashboard/creator"));
  }, [user, router]);

  if (loading || !user || !hub) {
    return <div className="mx-auto max-w-xl px-4 py-12 text-mowing-green/80">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <Link href="/dashboard/creator" className="text-sm text-par-3-punch hover:underline">
        ← Creator Hub
      </Link>
      <div className="mt-6">
        <CreatorActivityFeed items={hub.activity} limit={0} showViewAll={false} />
      </div>
    </div>
  );
}
