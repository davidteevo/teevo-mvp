"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import type { CreatorHubPayload } from "@/lib/creator/hub";
import { CreatorHubHero } from "@/components/creator/CreatorHubHero";
import { CreatorRewardCelebration } from "@/components/creator/CreatorRewardCelebration";
import { CreatorMissionCard } from "@/components/creator/CreatorMissionCard";
import { CreatorRewardJourney } from "@/components/creator/CreatorRewardJourney";
import {
  CreatorSharePanel,
  copyCreatorUrl,
  shareCreatorLink,
} from "@/components/creator/CreatorSharePanel";
import { CreatorSquadList } from "@/components/creator/CreatorSquadList";
import { CreatorFunnel } from "@/components/creator/CreatorFunnel";
import { CreatorActivityFeed } from "@/components/creator/CreatorActivityFeed";
import { CreatorStreakBar } from "@/components/creator/CreatorStreakBar";
import { CreatorPersonalBest } from "@/components/creator/CreatorPersonalBest";
import { CreatorToolkit } from "@/components/creator/CreatorToolkit";
import { CreatorEmptyState } from "@/components/creator/CreatorEmptyState";
import { CreatorStickyShare } from "@/components/creator/CreatorStickyShare";
import {
  loadSeenRewardIds,
  saveSeenRewardIds,
} from "@/components/creator/utils";
import { track } from "@/lib/analytics";
import type { CreatorHubActivityItem } from "@/lib/creator/hub";

export default function CreatorHubPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [hub, setHub] = useState<CreatorHubPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [celebration, setCelebration] = useState<CreatorHubActivityItem[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const shareSentinelRef = useRef<HTMLDivElement>(null!);
  const trackedView = useRef(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent("/dashboard/creator")}`);
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    setError(null);
    setHub(null);
    fetch("/api/creator/me")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          if (data.error === "not_a_creator") {
            router.replace("/dashboard");
            return;
          }
          throw new Error(data.error ?? "Could not load Creator Hub");
        }
        setHub(data as CreatorHubPayload);
      })
      .catch(() =>
        setError("We couldn't load your Creator Hub. Please try again.")
      );
  }, [user, router, reloadKey]);

  useEffect(() => {
    if (!hub || trackedView.current) return;
    trackedView.current = true;
    track("creator_hub_viewed", {
      empty: hub.isEmpty,
      programmePaused: hub.programmePaused,
      creatorInactive: hub.creatorInactive,
    });
  }, [hub]);

  useEffect(() => {
    if (!hub || hub.activity.length === 0) return;
    const seen = loadSeenRewardIds();
    const fresh = hub.activity.filter((a) => !seen.has(a.id));
    if (fresh.length === 0) {
      const all = new Set(seen);
      for (const a of hub.activity) all.add(a.id);
      saveSeenRewardIds(all);
      return;
    }
    setCelebration(fresh.slice(0, 3));
  }, [hub]);

  const markCelebrationSeen = useCallback(() => {
    if (!hub) return;
    const seen = loadSeenRewardIds();
    for (const a of hub.activity) seen.add(a.id);
    saveSeenRewardIds(seen);
    setCelebration(null);
  }, [hub]);

  const scrollToShare = () => {
    const el =
      document.getElementById("creator-share") ??
      document.getElementById("creator-share-desktop");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const onShare = async () => {
    if (!hub) return;
    const result = await shareCreatorLink(hub.url, hub.suggestedMessage);
    if (result === "copied") setCopiedLink(true);
  };

  const onCopyLink = async () => {
    if (!hub) return;
    const ok = await copyCreatorUrl(hub.url);
    if (ok) {
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (loading || !user) {
    return <div className="mx-auto max-w-xl px-4 py-12 text-mowing-green/80">Loading…</div>;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <Link href="/dashboard" className="text-sm text-par-3-punch hover:underline">
          ← Dashboard
        </Link>
        <p className="mt-4 text-sm text-divot-pink" role="alert">
          {error}
        </p>
        <button
          type="button"
          onClick={() => {
            trackedView.current = false;
            setReloadKey((k) => k + 1);
          }}
          className="mt-4 rounded-xl bg-mowing-green px-4 py-2.5 text-sm font-semibold text-off-white-pique"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!hub) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <div className="mt-6 h-72 animate-pulse rounded-2xl border border-par-3-punch/20 bg-par-3-punch/10" />
      </div>
    );
  }

  const journeyHasList = true;
  const journeyHasTx = true;
  const showOpportunities = hub.advertiseOpportunities;

  const statusBanners = (
    <>
      {hub.programmePaused && (
        <div
          className="rounded-2xl border border-golden-tee/50 bg-golden-tee/20 px-4 py-3 text-sm text-mowing-green"
          role="status"
        >
          <p className="font-semibold">Creator campaign currently paused</p>
          <p className="mt-1 text-mowing-green/80">
            You can still view your earnings, squad, and activity. New rewards are not being offered
            right now.
          </p>
        </div>
      )}
      {hub.creatorInactive && !hub.programmePaused && (
        <div
          className="rounded-2xl border border-divot-pink/40 bg-divot-pink/10 px-4 py-3 text-sm text-mowing-green"
          role="status"
        >
          <p className="font-semibold">Your Creator Programme access is currently inactive.</p>
          <p className="mt-1 text-mowing-green/80">
            Historical performance stays available. New rewards and attribution follow programme
            rules while inactive.
          </p>
        </div>
      )}
    </>
  );

  if (hub.isEmpty) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8 pb-24 lg:pb-8">
        <Link href="/dashboard" className="text-sm text-par-3-punch hover:underline">
          ← Dashboard
        </Link>
        <div className="mt-6 space-y-4">
          {statusBanners}
          <CreatorEmptyState
            steps={hub.rewardJourney.steps}
            potentialTotalPence={hub.rewardJourney.potentialTotalPence}
            headline={hub.rewardJourney.headline}
            url={hub.url}
            code={hub.code}
            toolkit={hub.toolkit}
            suggestedMessage={hub.suggestedMessage}
          />
        </div>
        {showOpportunities && hub.mission.title && (
          <div className="mt-6">
            <CreatorMissionCard
              title={hub.mission.title}
              body={hub.mission.body}
              ctaLabel={hub.mission.ctaLabel}
              ctaUrl={hub.mission.ctaUrl}
              rewardCallout={hub.mission.rewardCallout}
              onShareCta={scrollToShare}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-28 lg:pb-8">
      <Link href="/dashboard" className="text-sm text-par-3-punch hover:underline">
        ← Dashboard
      </Link>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-6">
          {statusBanners}

          <CreatorHubHero
            earnedPence={hub.earnedPence}
            pendingPence={hub.pendingPence}
            golfersReferred={hub.golfersReferred}
            successfulListings={hub.successfulListings}
            successfulTransactions={hub.successfulTransactions}
            onShare={() => void onShare()}
            onCopyLink={() => void onCopyLink()}
            copiedLink={copiedLink}
            shareRef={shareSentinelRef}
          />

          {celebration && celebration.length > 0 && (
            <CreatorRewardCelebration
              items={celebration}
              totalEarnedPence={hub.totalEarnedPence}
              onDismiss={markCelebrationSeen}
            />
          )}

          {showOpportunities && (
            <CreatorMissionCard
              title={hub.mission.title}
              body={hub.mission.body}
              ctaLabel={hub.mission.ctaLabel}
              ctaUrl={hub.mission.ctaUrl}
              rewardCallout={hub.mission.rewardCallout}
              onShareCta={scrollToShare}
            />
          )}

          <div className="lg:hidden">
            <CreatorSharePanel
              url={hub.url}
              code={hub.code}
              id="creator-share"
              suggestedMessage={hub.suggestedMessage}
            />
          </div>

          {showOpportunities && (
            <div className="lg:hidden">
              <CreatorRewardJourney
                steps={hub.rewardJourney.steps}
                potentialTotalPence={hub.rewardJourney.potentialTotalPence}
                headline={hub.rewardJourney.headline}
              />
            </div>
          )}

          <CreatorSquadList
            members={hub.squad}
            limit={5}
            journeyHasList={journeyHasList}
            journeyHasTx={journeyHasTx}
          />

          <CreatorFunnel
            visits={hub.funnelThisMonth.visits}
            joined={hub.funnelThisMonth.joined}
            listed={hub.funnelThisMonth.listed}
            transacted={hub.funnelThisMonth.transacted}
            insight={hub.insight}
          />

          <CreatorStreakBar
            current={hub.streak.current}
            target={hub.streak.target}
            remaining={hub.streak.remaining}
          />

          {hub.personalBest && <CreatorPersonalBest best={hub.personalBest} />}

          <CreatorActivityFeed items={hub.activity} limit={5} />

          <div className="lg:hidden">
            <CreatorToolkit captions={hub.toolkit} />
          </div>
        </div>

        <aside className="hidden space-y-6 lg:sticky lg:top-24 lg:block">
          <CreatorSharePanel
            url={hub.url}
            code={hub.code}
            id="creator-share-desktop"
            suggestedMessage={hub.suggestedMessage}
          />
          {showOpportunities && (
            <CreatorRewardJourney
              steps={hub.rewardJourney.steps}
              potentialTotalPence={hub.rewardJourney.potentialTotalPence}
              headline={hub.rewardJourney.headline}
            />
          )}
          <CreatorToolkit captions={hub.toolkit} />
        </aside>
      </div>

      <CreatorStickyShare onShare={() => void onShare()} sentinelRef={shareSentinelRef} />
    </div>
  );
}
