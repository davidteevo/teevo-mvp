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
import { CreatorActivityFeed } from "@/components/creator/CreatorActivityFeed";
import { CreatorToolkit } from "@/components/creator/CreatorToolkit";
import { CreatorEmptyState } from "@/components/creator/CreatorEmptyState";
import { CreatorStickyShare } from "@/components/creator/CreatorStickyShare";
import {
  CreatorQuickNav,
  type CreatorQuickToolId,
} from "@/components/creator/CreatorQuickNav";
import { CreatorStickyNav } from "@/components/creator/CreatorStickyNav";
import { CreatorEarningsCard } from "@/components/creator/CreatorEarningsCard";
import {
  loadSeenRewardIds,
  saveSeenRewardIds,
} from "@/components/creator/utils";
import { track } from "@/lib/analytics";
import type { CreatorHubActivityItem } from "@/lib/creator/hub";

const SECTION_IDS: Record<CreatorQuickToolId, string> = {
  share: "creator-share",
  squad: "creator-squad",
  earnings: "creator-earnings",
  activity: "creator-activity",
  content: "creator-content",
  mission: "creator-mission",
};

function scrollToSection(id: CreatorQuickToolId) {
  document.getElementById(SECTION_IDS[id])?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function HubSkeleton() {
  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-8">
      <div className="h-48 animate-pulse rounded-3xl bg-mowing-green/20" />
      <div className="h-20 animate-pulse rounded-xl bg-par-3-punch/15" />
      <div className="h-32 animate-pulse rounded-xl bg-par-3-punch/10" />
      <div className="h-28 animate-pulse rounded-xl bg-par-3-punch/10" />
    </div>
  );
}

export default function CreatorHubPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [hub, setHub] = useState<CreatorHubPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [celebration, setCelebration] = useState<CreatorHubActivityItem[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const shareSentinelRef = useRef<HTMLDivElement>(null!);
  const quickNavRef = useRef<HTMLElement | null>(null);
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
    const fresh = hub.activity.filter(
      (a) => a.amountPence > 0 && a.tone === "earned" && !seen.has(a.id)
    );
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
    return <HubSkeleton />;
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
    return <HubSkeleton />;
  }

  const showOpportunities = hub.advertiseOpportunities;
  const showMission = showOpportunities && Boolean(hub.mission.title);
  const journeyHasList = hub.rewardJourney.steps.some((s) => s.key === "list");
  const journeyHasTx = hub.rewardJourney.steps.some((s) => s.key === "transact");

  const statusBanners = (
    <>
      {hub.programmePaused && (
        <div
          className="rounded-2xl border border-golden-tee/50 bg-golden-tee/20 px-4 py-3 text-sm text-mowing-green"
          role="status"
        >
          <p className="font-semibold">Creator campaign currently paused</p>
          <p className="mt-1 text-mowing-green/80">
            You can still view your Teevo credit, squad, and activity. New rewards are not being
            offered right now.
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

  return (
    <div className="mx-auto w-full min-w-0 max-w-xl overflow-x-clip px-4 py-6 pb-28 lg:pb-10">
      <Link href="/dashboard" className="text-sm text-par-3-punch hover:underline">
        ← Dashboard
      </Link>

      <div className="mt-4 min-w-0 space-y-5">
        {statusBanners}

        {hub.isEmpty ? (
          <CreatorEmptyState
            steps={hub.rewardJourney.steps}
            potentialTotalPence={hub.rewardJourney.potentialTotalPence}
            onShare={() => void onShare()}
            shareRef={shareSentinelRef}
          />
        ) : (
          <CreatorHubHero
            earnedPence={hub.earnedPence}
            pendingPence={hub.pendingPence}
            opportunityPence={hub.opportunityPence}
            golfersReferred={hub.golfersReferred}
            successfulListings={hub.successfulListings}
            successfulTransactions={hub.successfulTransactions}
            onShare={() => void onShare()}
            onCopyLink={() => void onCopyLink()}
            copiedLink={copiedLink}
            shareRef={shareSentinelRef}
          />
        )}

        {celebration && celebration.length > 0 && (
          <CreatorRewardCelebration
            items={celebration}
            totalEarnedPence={hub.totalEarnedPence}
            onDismiss={markCelebrationSeen}
          />
        )}

        <CreatorQuickNav
          showMission={showMission}
          onNavigate={scrollToSection}
          navRef={quickNavRef}
        />

        <CreatorStickyNav
          showMission={showMission}
          quickNavRef={quickNavRef}
          onNavigate={scrollToSection}
        />

        <CreatorSharePanel
          url={hub.url}
          code={hub.code}
          id="creator-share"
          suggestedMessage={hub.suggestedMessage}
        />

        <CreatorSquadList
          id="creator-squad"
          members={hub.squad}
          funnel={hub.squadFunnel}
          opportunityPence={hub.opportunityPence}
          oneStepAwayCount={hub.oneStepAwayCount}
          limit={3}
          journeyHasList={journeyHasList}
          journeyHasTx={journeyHasTx}
          onShare={() => void onShare()}
        />

        {showMission && (
          <CreatorMissionCard
            id="creator-mission"
            title={hub.mission.title}
            body={hub.mission.body}
            ctaLabel={hub.mission.ctaLabel}
            ctaUrl={hub.mission.ctaUrl}
            rewardCallout={hub.mission.rewardCallout}
            progressCurrent={hub.mission.progressCurrent}
            progressTarget={hub.mission.progressTarget}
            potentialRewardPence={hub.mission.potentialRewardPence}
            onShareCta={() => scrollToSection("share")}
          />
        )}

        <CreatorActivityFeed id="creator-activity" items={hub.activity} limit={4} />

        <CreatorToolkit id="creator-content" captions={hub.toolkit} />

        <CreatorEarningsCard
          id="creator-earnings"
          earnedPence={hub.earnedPence}
          pendingPence={hub.pendingPence}
          opportunityPence={hub.opportunityPence}
          recentRewards={hub.activity}
          personalBest={hub.personalBest}
        />

        {showOpportunities && (
          <CreatorRewardJourney
            id="creator-how-you-earn"
            steps={hub.rewardJourney.steps}
            potentialTotalPence={hub.rewardJourney.potentialTotalPence}
          />
        )}
      </div>

      <CreatorStickyShare
        onShare={() => void onShare()}
        sentinelRef={shareSentinelRef}
        potentialTotalPence={hub.rewardJourney.potentialTotalPence}
      />
    </div>
  );
}
