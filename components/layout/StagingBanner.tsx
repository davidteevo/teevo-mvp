import { isStaging } from "@/lib/app-env";

/**
 * Fixed badge visible only when NEXT_PUBLIC_APP_ENV=staging.
 * Never render in production.
 */
export function StagingBanner() {
  if (!isStaging()) return null;

  return (
    <div
      role="status"
      aria-label="Test environment"
      className="fixed top-0 left-0 right-0 z-[100] flex justify-center pointer-events-none"
    >
      <span className="pointer-events-none mt-0 rounded-b bg-[#FFD25E] px-3 py-0.5 text-[11px] font-semibold tracking-wide text-[#265C4B] shadow-sm">
        TEST ENVIRONMENT
      </span>
    </div>
  );
}
