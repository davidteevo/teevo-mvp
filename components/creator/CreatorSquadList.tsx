"use client";

import Link from "next/link";
import { formatPoundsCompact } from "@/components/creator/utils";
import type { CreatorHubSquadMember } from "@/lib/creator/hub";
import { track } from "@/lib/analytics";

function ProgressMarks({
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
    <p className="text-sm text-mowing-green/80" aria-label={nodes.map((n) => `${n.label} ${n.done ? "done" : "pending"}`).join(", ")}>
      {nodes.map((n, i) => (
        <span key={n.label}>
          {i > 0 && <span className="mx-1 text-mowing-green/40">→</span>}
          <span className={n.done ? "font-semibold text-par-3-punch" : ""}>
            {n.done ? "✓" : "○"} {n.label}
          </span>
        </span>
      ))}
    </p>
  );
}

type Props = {
  members: CreatorHubSquadMember[];
  funnel: { joined: number; listed: number; transacted: number };
  opportunityPence: number;
  oneStepAwayCount: number;
  limit?: number;
  showViewAll?: boolean;
  journeyHasList: boolean;
  journeyHasTx: boolean;
  onShare?: () => void;
  id?: string;
};

export function CreatorSquadList({
  members,
  funnel,
  opportunityPence,
  oneStepAwayCount,
  limit = 3,
  showViewAll = true,
  journeyHasList,
  journeyHasTx,
  onShare,
  id,
}: Props) {
  const shown = limit > 0 ? members.slice(0, limit) : members;

  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="text-lg font-bold text-mowing-green">
        Your Squad <span aria-hidden>👥</span>
      </h2>

      {members.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-par-3-punch/30 bg-white p-4">
          <p className="font-semibold text-mowing-green">
            Your squad starts with one golfer <span aria-hidden>👥</span>
          </p>
          <p className="mt-1 text-sm text-mowing-green/70">
            Share Teevo with someone who has clubs gathering dust.
          </p>
          {onShare && (
            <button
              type="button"
              onClick={onShare}
              className="mt-3 inline-flex min-h-[44px] items-center rounded-xl bg-mowing-green px-4 py-2 text-sm font-semibold text-off-white-pique"
            >
              Share Teevo
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-mowing-green/70">
            {funnel.joined} golfer{funnel.joined === 1 ? "" : "s"} referred
          </p>
          <p className="mt-2 text-sm font-semibold text-mowing-green">
            {funnel.joined} Joined
            <span className="mx-1.5 text-par-3-punch" aria-hidden>
              →
            </span>
            {funnel.listed} Listed
            <span className="mx-1.5 text-par-3-punch" aria-hidden>
              →
            </span>
            {funnel.transacted} Transacted
          </p>

          {opportunityPence > 0 && (
            <div className="mt-3 rounded-xl bg-golden-tee/25 px-3 py-2.5 text-sm text-mowing-green">
              <p className="font-semibold">
                {formatPoundsCompact(opportunityPence)} still available from your squad
              </p>
              {oneStepAwayCount > 0 && (
                <p className="mt-0.5 text-mowing-green/80">
                  {oneStepAwayCount} golfer{oneStepAwayCount === 1 ? " is" : "s are"} one step away
                  from earning you another reward.
                </p>
              )}
            </div>
          )}

          <ul className="mt-3 space-y-2">
            {shown.map((m) => (
              <li
                key={m.referralId}
                className="rounded-xl border border-par-3-punch/15 bg-white px-3 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-mowing-green">{m.label}</p>
                  {m.earnedPence > 0 && (
                    <p className="shrink-0 text-sm font-semibold text-par-3-punch">
                      +{formatPoundsCompact(m.earnedPence)}
                    </p>
                  )}
                </div>
                <div className="mt-1.5">
                  <ProgressMarks
                    joined={m.joined}
                    listed={m.listed}
                    transacted={m.transacted}
                    showList={journeyHasList}
                    showTx={journeyHasTx}
                  />
                </div>
                {m.nextStepHint && (
                  <p className="mt-1 text-xs text-mowing-green/70">{m.nextStepHint}</p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {showViewAll && members.length > limit && (
        <Link
          href="/dashboard/creator/squad"
          onClick={() => track("creator_squad_viewed", { count: members.length })}
          className="mt-3 inline-block text-sm font-semibold text-par-3-punch hover:underline"
        >
          View squad →
        </Link>
      )}
    </section>
  );
}
