"use client";

import {
  Activity,
  Banknote,
  Megaphone,
  Share2,
  Target,
  Users,
} from "lucide-react";
import { track } from "@/lib/analytics";

export type CreatorQuickToolId =
  | "share"
  | "squad"
  | "earnings"
  | "activity"
  | "content"
  | "mission";

type Props = {
  showMission?: boolean;
  onNavigate: (id: CreatorQuickToolId) => void;
  navRef?: React.RefObject<HTMLElement | null>;
};

const TOOLS: {
  id: CreatorQuickToolId;
  label: string;
  icon: typeof Share2;
  missionOnly?: boolean;
}[] = [
  { id: "share", label: "Share", icon: Share2 },
  { id: "squad", label: "Squad", icon: Users },
  { id: "mission", label: "Mission", icon: Target, missionOnly: true },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "content", label: "Content", icon: Megaphone },
  { id: "earnings", label: "Credit", icon: Banknote },
];

export function CreatorQuickNav({ showMission = true, onNavigate, navRef }: Props) {
  const tools = TOOLS.filter((t) => !t.missionOnly || showMission);

  return (
    <section
      ref={navRef as React.RefObject<HTMLElement>}
      data-testid="creator-quick-nav"
      className="min-w-0 max-w-full"
    >
      <h2 className="text-base font-bold text-mowing-green">Quick tools</h2>
      <div className="mt-3 flex gap-2 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:grid sm:grid-cols-6 sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
        {tools.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              track("creator_quick_tool_clicked", { tileId: id });
              track("creator_hub_quick_nav", { tileId: id });
              onNavigate(id);
            }}
            className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 rounded-xl border border-par-3-punch/20 bg-white px-2 py-3 text-center transition-colors hover:bg-par-3-punch/10 active:bg-par-3-punch/15 sm:w-auto sm:min-w-0"
          >
            <span className="rounded-lg bg-mowing-green/10 p-2">
              <Icon className="h-4 w-4 text-mowing-green" aria-hidden />
            </span>
            <span className="text-xs font-semibold text-mowing-green">{label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
