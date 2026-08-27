"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import type { CreatorHubPayload } from "@/lib/creator/hub";
import { CreatorSquadList } from "@/components/creator/CreatorSquadList";
import { track } from "@/lib/analytics";

export default function CreatorSquadPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [hub, setHub] = useState<CreatorHubPayload | null>(null);
  const tracked = useRef(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent("/dashboard/creator/squad")}`);
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

  useEffect(() => {
    if (!hub || tracked.current) return;
    tracked.current = true;
    track("creator_referrals_viewed", { count: hub.squad.length });
  }, [hub]);

  if (loading || !user || !hub) {
    return <div className="mx-auto max-w-xl px-4 py-12 text-mowing-green/80">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/dashboard/creator" className="text-sm text-par-3-punch hover:underline">
        ← Creator Hub
      </Link>
      <div className="mt-6">
        <CreatorSquadList
          members={hub.squad}
          limit={0}
          showViewAll={false}
          journeyHasList
          journeyHasTx
        />
      </div>
    </div>
  );
}
