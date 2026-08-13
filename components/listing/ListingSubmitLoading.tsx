"use client";

import { FullScreenLoading } from "@/components/ui/FullScreenLoading";

export function ListingSubmitLoading() {
  return (
    <FullScreenLoading
      title="Getting your listing ready..."
      subtitle="Just a moment while Teevo prepares your listing."
      className="z-[60]"
    />
  );
}
