import Image from "next/image";
import Link from "next/link";
import { Target } from "lucide-react";
import { FIT_COMING_SOON, TEEVO_FIT_NAME } from "@/lib/fit-access";

export function FitComingSoon() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:py-12">
      <section className="relative mx-auto max-w-lg overflow-hidden rounded-2xl border border-mowing-green/15 bg-gradient-to-br from-mowing-green/[0.08] via-off-white-pique to-golden-tee/30 px-5 py-8 sm:px-8 sm:py-12">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-par-3-punch/15 blur-2xl"
          aria-hidden
        />
        <div className="relative">
          <Image
            src="/logo-text.png"
            alt="Teevo"
            width={120}
            height={38}
            className="h-8 w-auto"
            priority
          />
          <p className="mt-6 inline-flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-golden-tee text-mowing-green">
              <Target className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-sm font-semibold text-mowing-green">{TEEVO_FIT_NAME}</span>
          </p>
          <p className="mt-4 inline-flex rounded-full bg-golden-tee px-2.5 py-1 text-xs font-semibold tracking-wide text-mowing-green">
            {FIT_COMING_SOON.status}
          </p>
          <h1 className="mt-4 text-[1.75rem] font-bold leading-tight text-mowing-green sm:text-4xl">
            {FIT_COMING_SOON.heading}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-mowing-green/80 sm:text-base">
            {FIT_COMING_SOON.description}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-mowing-green/80 sm:text-base">
            {FIT_COMING_SOON.detail}
          </p>
          <Link
            href={FIT_COMING_SOON.ctaHref}
            className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-mowing-green px-5 text-sm font-semibold text-off-white-pique hover:opacity-90"
          >
            {FIT_COMING_SOON.cta}
          </Link>
        </div>
      </section>
    </main>
  );
}
