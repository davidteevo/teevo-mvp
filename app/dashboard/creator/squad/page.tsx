"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import type { CreatorHubPayload } from "@/lib/creator/hub";
import { CreatorSquadList } from "@/components/creator/CreatorSquadList";

export default function CreatorSquadPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [hub, setHub] = useState<CreatorHubPayload | null>(null);

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

  if (loading || !user || !hub) {
    return <div className="mx-auto max-w-xl px-4 py-12 text-mowing-green/80">Loading…</div>;
  }

  const journeyHasList = hub.rewardJourney.steps.some((s) => s.key === "list");
  const journeyHasTx = hub.rewardJourney.steps.some((s) => s.key === "transact");

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
          journeyHasList={journeyHasList}
          journeyHasTx={journeyHasTx}
        />
      </div>
    </div>
  );
}
