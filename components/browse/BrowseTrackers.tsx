"use client";

import Link from "next/link";
import { useEffect } from "react";
import { track } from "@/lib/analytics";

export function BrowseMarketplacePreviewTracker() {
  useEffect(() => {
    track("browse_marketplace_preview_viewed");
  }, []);
  return null;
}

export function BrowseAllClubsLink({ className }: { className?: string }) {
  return (
    <Link
      href="/signup?redirect=/"
      onClick={() => track("browse_all_clubs_clicked")}
      className={className}
    >
      Browse all clubs →
    </Link>
  );
}
