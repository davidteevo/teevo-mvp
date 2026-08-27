"use client";

import Link from "next/link";
import { formatPoundsCompact } from "@/components/creator/utils";
import type { CreatorHubSquadMember } from "@/lib/creator/hub";

function ProgressDots({
  joined,
  listed,
  transacted,
  showList,
  showTx,
}: {
  joined: boolean;
  listed: boolean;
  transacted: boolean;
  showList: boolean;
  showTx: boolean;
}) {
  const nodes: { done: boolean; label: string }[] = [{ done: joined, label: "Joined" }];
  if (showList) nodes.push({ done: listed, label: "Listed" });
  if (showTx) nodes.push({ done: transacted, label: "Transacted" });

  return (
    <div>
      <div className="flex items-center gap-0" aria-hidden>
        {nodes.map((n, i) => (
          <div key={n.label} className="flex items-center">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                n.done ? "bg-par-3-punch" : "bg-mowing-green/20"
              }`}
            />
            {i < nodes.length - 1 && (
              <span
                className={`mx-0.5 h-0.5 w-8 sm:w-10 ${
                  n.done && nodes[i + 1]?.done ? "bg-par-3-punch" : "bg-mowing-green/15"
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-mowing-green/70">{nodes.map((n) => n.label).join(" → ")}</p>
    </div>
  );
}

type Props = {
  members: CreatorHubSquadMember[];
  limit?: number;
  showViewAll?: boolean;
  journeyHasList: boolean;
  journeyHasTx: boolean;
};

export function CreatorSquadList({
  members,
  limit = 5,
  showViewAll = true,
  journeyHasList,
  journeyHasTx,
}: Props) {
  const shown = limit > 0 ? members.slice(0, limit) : members;

  return (
    <section>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-mowing-green">Your Squad</h2>
          <p className="mt-1 text-sm text-mowing-green/70">
            See how the golfers you&apos;ve brought to Teevo are getting on.
          </p>
        </div>
      </div>

      {members.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-par-3-punch/30 bg-white p-5 text-sm text-mowing-green/70">
          Your squad will show up here once someone joins with your link.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {shown.map((m) => {
            const complete = m.completedSteps >= m.totalSteps && m.totalSteps > 0;
            return (
              <li
                key={m.referralId}
                className="rounded-2xl border border-par-3-punch/20 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-mowing-green">{m.label}</p>
                  <p className="shrink-0 text-sm font-medium text-mowing-green/80">
                    {m.completedSteps}/{m.totalSteps} complete
                    {complete ? " 🔥" : ""}
                  </p>
                </div>
                <div className="mt-3">
                  <ProgressDots
                    joined={m.joined}
                    listed={m.listed}
                    transacted={m.transacted}
                    showList={journeyHasList}
                    showTx={journeyHasTx}
                  />
                </div>
                <p className="mt-3 text-sm font-semibold text-par-3-punch">
                  +{formatPoundsCompact(m.earnedPence)} earned
                </p>
                {m.nextStepHint && (
                  <p className="mt-1 text-sm text-mowing-green/80">{m.nextStepHint}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {showViewAll && members.length > limit && (
        <Link
          href="/dashboard/creator/squad"
          className="mt-4 inline-block text-sm font-semibold text-par-3-punch hover:underline"
        >
          View all referrals →
        </Link>
      )}
    </section>
  );
}
