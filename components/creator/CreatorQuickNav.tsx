"use client";

import {
  Activity,
  Banknote,
  FolderOpen,
  Megaphone,
  Share2,
  Target,
  Users,
} from "lucide-react";
import { track } from "@/lib/analytics";

export type CreatorQuickToolId =
  | "share"
  | "brand_pack"
  | "squad"
  | "earnings"
  | "activity"
  | "content"
  | "mission";

export type CreatorHubSectionId = Exclude<CreatorQuickToolId, "brand_pack">;

type Props = {
  showMission?: boolean;
  showBrandPack?: boolean;
  onNavigate: (id: CreatorHubSectionId) => void;
  navRef?: React.RefObject<HTMLElement | null>;
};

const TOOLS: {
  id: CreatorQuickToolId;
  label: string;
  icon: typeof Share2;
  missionOnly?: boolean;
  brandPackOnly?: boolean;
  external?: boolean;
}[] = [
  { id: "share", label: "Share", icon: Share2 },
  { id: "brand_pack", label: "Brand Pack", icon: FolderOpen, brandPackOnly: true, external: true },
  { id: "squad", label: "Squad", icon: Users },
  { id: "mission", label: "Mission", icon: Target, missionOnly: true },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "content", label: "Content", icon: Megaphone },
  { id: "earnings", label: "Credit", icon: Banknote },
];

const BRAND_PACK_HREF = "/creator/brand-pack?source=quick_tools";

export function CreatorQuickNav({
  showMission = true,
  showBrandPack = false,
  onNavigate,
  navRef,
}: Props) {
  const tools = TOOLS.filter((t) => {
    if (t.missionOnly && !showMission) return false;
    if (t.brandPackOnly && !showBrandPack) return false;
    return true;
  });

  return (
    <section
      ref={navRef as React.RefObject<HTMLElement>}
      data-testid="creator-quick-nav"
      className="min-w-0 max-w-full"
    >
      <h2 className="text-base font-bold text-mowing-green">Quick tools</h2>
      <div className="mt-3 flex gap-2 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
        {tools.map(({ id, label, icon: Icon, external }) => (
          <button
            key={id}
            type="button"
            aria-label={external ? "Open Teevo Creator Brand Pack" : undefined}
            onClick={() => {
              if (external) {
                track("creator_quick_tool_clicked", { tileId: id });
                track("creator_hub_quick_nav", { tileId: id });
                window.open(BRAND_PACK_HREF, "_blank", "noopener,noreferrer");
                return;
              }
              track("creator_quick_tool_clicked", { tileId: id });
              track("creator_hub_quick_nav", { tileId: id });
              onNavigate(id as CreatorHubSectionId);
            }}
            className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 rounded-xl border border-par-3-punch/20 bg-white px-2 py-3 text-center transition-colors hover:bg-par-3-punch/10 active:bg-par-3-punch/15 sm:w-[5rem]"
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
