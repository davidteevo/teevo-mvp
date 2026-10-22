import Link from "next/link";
import { Target } from "lucide-react";
import { FIT_COMING_SOON, TEEVO_FIT_NAME } from "@/lib/fit-access";

export function FitComingSoon() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-xl px-4 py-5 sm:py-10">
      <section className="rounded-2xl border border-mowing-green/15 bg-gradient-to-b from-golden-tee/30 via-off-white-pique to-off-white-pique px-5 py-6 sm:px-8 sm:py-10">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-mowing-green">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-golden-tee text-mowing-green">
              <Target className="h-4 w-4" aria-hidden />
            </span>
            {TEEVO_FIT_NAME}
          </p>
          <p className="inline-flex rounded-full bg-golden-tee px-2.5 py-1 text-xs font-semibold text-mowing-green">
            {FIT_COMING_SOON.status}
          </p>
        </div>
        <h1 className="mt-5 max-w-[12ch] text-[1.75rem] font-bold leading-[1.15] text-mowing-green sm:max-w-none sm:text-4xl">
          {FIT_COMING_SOON.heading}
        </h1>
        <p className="mt-4 text-sm leading-6 text-mowing-green/80 sm:text-base sm:leading-7">
          {FIT_COMING_SOON.description}
        </p>
        <p className="mt-3 text-sm font-semibold leading-6 text-mowing-green sm:text-base">
          {FIT_COMING_SOON.drivers}
        </p>
        <p className="mt-1 text-sm leading-6 text-mowing-green/80 sm:text-base sm:leading-7">
          {FIT_COMING_SOON.detail}
        </p>
        <Link
          href={FIT_COMING_SOON.ctaHref}
          className="mt-6 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-mowing-green px-5 text-sm font-semibold text-off-white-pique hover:opacity-90 sm:inline-flex sm:w-auto"
        >
          {FIT_COMING_SOON.cta}
        </Link>
      </section>
    </div>
  );
}
