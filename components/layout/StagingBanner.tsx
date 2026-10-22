import { isStaging } from "@/lib/app-env";

/**
 * Visible only when NEXT_PUBLIC_APP_ENV=staging.
 * Sits in normal flow so it does not cover the trust strip.
 * Never render in production.
 */
export function StagingBanner() {
  if (!isStaging()) return null;

  return (
    <div role="status" aria-label="Test environment" className="bg-[#FFD25E] text-center">
      <p className="px-3 py-1 text-[11px] font-semibold tracking-wide text-[#265C4B]">
        TEST ENVIRONMENT
      </p>
    </div>
  );
}
