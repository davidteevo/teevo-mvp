"use client";

import { useEffect, useState } from "react";
import type { CreatorQuickToolId } from "@/components/creator/CreatorQuickNav";
import { track } from "@/lib/analytics";

type Section = { id: CreatorQuickToolId; label: string; targetId: string };

const SECTIONS: Section[] = [
  { id: "share", label: "Share", targetId: "creator-share" },
  { id: "squad", label: "Squad", targetId: "creator-squad" },
  { id: "mission", label: "Mission", targetId: "creator-mission" },
  { id: "activity", label: "Activity", targetId: "creator-activity" },
  { id: "content", label: "Content", targetId: "creator-content" },
  { id: "earnings", label: "£", targetId: "creator-earnings" },
];

type Props = {
  showMission?: boolean;
  quickNavRef: React.RefObject<HTMLElement | null>;
  onNavigate: (id: CreatorQuickToolId) => void;
};

export function CreatorStickyNav({
  showMission = true,
  quickNavRef,
  onNavigate,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState<CreatorQuickToolId | null>(null);
  const sections = SECTIONS.filter((s) => showMission || s.id !== "mission");

  useEffect(() => {
    const el = quickNavRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-56px 0px 0px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [quickNavRef]);

  useEffect(() => {
    const activeSections = SECTIONS.filter((s) => showMission || s.id !== "mission");
    const targets = activeSections
      .map((s) => document.getElementById(s.targetId))
      .filter((el): el is HTMLElement => Boolean(el));
    if (targets.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visibleEntries[0];
        if (!top?.target?.id) return;
        const match = activeSections.find((s) => s.targetId === top.target.id);
        if (match) setActive(match.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5] }
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, [showMission]);

  if (!visible) return null;

  return (
    <nav
      aria-label="Creator Hub sections"
      className="sticky top-14 z-40 mb-2 w-full max-w-full min-w-0 border-b border-par-3-punch/20 bg-off-white-pique/95 py-2 backdrop-blur-md sm:rounded-xl sm:border sm:px-2"
    >
      <ul className="flex gap-1 overflow-x-auto">
        {sections.map((s) => {
          const isActive = active === s.id;
          return (
            <li key={s.id} className="shrink-0">
              <button
                type="button"
                aria-current={isActive ? "true" : undefined}
                onClick={() => {
                  track("creator_quick_tool_clicked", { tileId: s.id, sticky: true });
                  onNavigate(s.id);
                }}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-mowing-green text-off-white-pique"
                    : "text-mowing-green/80 hover:bg-mowing-green/10"
                }`}
              >
                {s.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
