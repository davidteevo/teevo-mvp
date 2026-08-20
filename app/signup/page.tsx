"use client";

import { Suspense, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";
import { parseWatchListingId } from "@/lib/watchlist";
import {
  Clock,
  Eye,
  EyeOff,
  Gift,
  Lock,
  Mail,
  MessageCircle,
  PoundSterling,
  Shield,
  Sparkles,
  Star,
  User,
} from "lucide-react";
import { FOUNDER_EVENTS } from "@/lib/founder/types";

const inputClass =
  "w-full min-h-[48px] rounded-xl border border-mowing-green/25 bg-white pl-11 pr-4 py-3 text-base text-mowing-green placeholder:text-mowing-green/45 disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-par-3-punch/60 focus-visible:border-par-3-punch";

function SignupForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [founderCampaign, setFounderCampaign] = useState<{
    active: boolean;
    claimed: number;
    limit: number;
    progressLabel: string;
  } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.href = `/api/auth/signout?redirect=${encodeURIComponent("/signup" + (searchParams.toString() ? "?" + searchParams.toString() : ""))}`;
      }
    });
    const fromQuery = searchParams.get("ref") ?? "";
    const fromCookie = document.cookie.match(/(?:^|;\s*)teevo_ref=([^;]*)/)?.[1] ?? "";
    const prefill = fromQuery || (fromCookie ? decodeURIComponent(fromCookie) : "");
    if (prefill) setReferralCode(prefill);
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/founder/campaign")
      .then((r) => r.json())
      .then((d) => {
        if (d?.active) {
          setFounderCampaign({
            active: true,
            claimed: d.claimed,
            limit: d.limit ?? 100,
            progressLabel: d.progressLabel,
          });
          track(FOUNDER_EVENTS.SIGNUP_STARTED, {
            claimed: d.claimed,
            remaining: d.remaining,
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const first = firstName.trim();
    if (!first) {
      setError("Please enter your first name.");
      return;
    }
    if (!acceptedLegal) {
      setError("Please agree to the Terms & Conditions and Privacy Policy to create an account.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const redirectTo = origin ? `${origin}/auth/callback` : undefined;
    const callbackParams = new URLSearchParams();
    if (redirect) callbackParams.set("next", redirect);
    const trimmedCode = referralCode.trim();
    if (trimmedCode) callbackParams.set("ref", trimmedCode);
    const nextParam = callbackParams.toString() ? `?${callbackParams.toString()}` : "";
    const emailRedirectTo = redirectTo && nextParam ? `${redirectTo}${nextParam}` : redirectTo;
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: first, ...(trimmedCode ? { referral_code: trimmedCode } : {}) },
        ...(emailRedirectTo ? { emailRedirectTo } : {}),
      },
    });
    if (err) {
      const lower = err.message.toLowerCase();
      setError(
        lower.includes("rate") || lower.includes("rate limit") || lower.includes("too many requests")
          ? "Too many sign-up attempts. Please wait a few minutes and try again. You can increase auth rate limits in Supabase Dashboard → Authentication → Rate Limits."
          : err.message
      );
      setLoading(false);
      return;
    }
    setLoading(false);
    if (data?.user?.identities?.length === 0) {
      setError("An account with this email already exists. Try logging in instead.");
      await supabase.auth.signOut({ scope: "local" });
      return;
    }
    track("seller_signup_complete", { redirect });
    if (founderCampaign?.active) {
      track(FOUNDER_EVENTS.SIGNUP_COMPLETED, { claimed: founderCampaign.claimed });
    }
    const watchListingId = parseWatchListingId(redirect);
    if (watchListingId) {
      track("watchlist_account_created", { listing_id: watchListingId, source: "signup" });
    }
    setEmailVerificationSent(true);
  };

  if (emailVerificationSent) {
    return (
      <div className="w-full max-w-lg mx-auto px-4 sm:px-6 py-12 text-center">
        <div className="mb-6 flex justify-center">
          <Image src="/logo-text.png" alt="Teevo" width={140} height={44} className="h-10 w-auto" priority />
        </div>
        <div className="rounded-2xl border border-par-3-punch/30 bg-white p-8 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-golden-tee/30">
            <Mail className="h-7 w-7 text-mowing-green" aria-hidden />
          </div>
          <h1 className="mt-5 text-xl font-bold text-mowing-green">Check your inbox</h1>
          <p className="mt-2 text-sm leading-relaxed text-mowing-green/90">
            We&apos;ve sent a link to <strong>{email}</strong>. Click it to confirm your email, then log in
            with the password you just chose.
          </p>
          {founderCampaign?.active && (
            <p className="mt-3 text-sm font-medium text-mowing-green">
              Confirm your email to secure your Founder spot.
            </p>
          )}
          <p className="mt-4 text-xs text-mowing-green/70">No email? Check spam, or wait a minute and try again.</p>
        </div>
        <p className="mt-6">
          <Link href="/login" className="text-sm font-medium text-par-3-punch hover:underline">
            Back to log in
          </Link>
        </p>
      </div>
    );
  }

  const founderActive = Boolean(founderCampaign?.active);
  const claimed = founderCampaign?.claimed ?? 0;
  const limit = founderCampaign?.limit ?? 100;
  const progressPct = Math.max(0, Math.min(100, (claimed / Math.max(limit, 1)) * 100));
  const watchListing = Boolean(parseWatchListingId(redirect));

  return (
    <div className="relative w-full px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      {loading && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-off-white-pique/90 backdrop-blur-sm"
          aria-live="polite"
          role="status"
          aria-label="Setting up your account"
        >
          <div className="h-12 w-12 rounded-full border-2 border-mowing-green/20 border-t-mowing-green animate-spin" />
          <p className="mt-4 font-semibold text-mowing-green">Setting up your account</p>
          <p className="mt-1 text-sm text-mowing-green/70">Please wait a moment…</p>
        </div>
      )}

      <div className="mx-auto max-w-5xl">
        {/* Hero */}
        <section className="grid items-center gap-6 lg:grid-cols-[1fr_minmax(220px,320px)] lg:gap-10">
          <div>
            {founderActive ? (
              <>
                <p className="inline-flex items-center gap-1.5 rounded-full bg-golden-tee px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-mowing-green">
                  <Star className="h-3.5 w-3.5 fill-mowing-green text-mowing-green" aria-hidden />
                  Founder spots available
                </p>
                <h1 className="mt-4 text-3xl font-bold leading-tight text-mowing-green sm:text-4xl">
                  Help build Teevo. Earn <span className="text-par-3-punch">£5</span>.
                </h1>
                <p className="mt-3 max-w-xl text-base text-mowing-green/80 sm:text-lg">
                  We&apos;re opening our first 100 founder spots to shape the future of second-hand golf.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold leading-tight text-mowing-green sm:text-4xl">
                  {watchListing ? "Save this club to your Watchlist" : "Join Teevo"}
                </h1>
                <p className="mt-3 max-w-xl text-base text-mowing-green/80 sm:text-lg">
                  {watchListing
                    ? "Create a free account to keep an eye on this listing."
                    : "Create an account to buy and sell golf gear."}
                </p>
              </>
            )}
          </div>

          <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
            <div className="absolute -inset-2 rounded-[2rem] bg-gradient-to-br from-par-3-punch/20 via-mowing-green/5 to-golden-tee/30 blur-sm" aria-hidden />
            <div className="relative overflow-hidden rounded-3xl border border-mowing-green/10 bg-off-white-pique p-2 sm:p-3">
              <Image
                src="/founder-signup-art.png"
                alt="Golfers shaping Teevo together"
                width={480}
                height={430}
                className="h-auto w-full"
                priority
              />
            </div>
          </div>
        </section>

        {/* Campaign status strip */}
        {founderActive && (
          <section
            className="mt-8 rounded-2xl border border-golden-tee/40 bg-golden-tee/20 px-4 py-4 sm:px-5"
            aria-label="Founder campaign status"
          >
            <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
              <div>
                <p className="text-sm text-mowing-green/80">
                  Founder spots available:{" "}
                  <span className="font-bold tabular-nums text-mowing-green">
                    {claimed} / {limit} claimed
                  </span>
                </p>
                <div
                  className="mt-2 h-2 overflow-hidden rounded-full bg-mowing-green/15"
                  role="progressbar"
                  aria-valuenow={claimed}
                  aria-valuemin={0}
                  aria-valuemax={limit}
                  aria-label={`${claimed} of ${limit} Founder spots claimed`}
                >
                  <div
                    className="h-full rounded-full bg-mowing-green motion-safe:transition-[width] motion-safe:duration-700"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mowing-green text-off-white-pique">
                  <PoundSterling className="h-4 w-4" aria-hidden />
                </span>
                <p className="text-sm text-mowing-green/85">
                  <span className="font-semibold text-mowing-green">Earn £5 credit</span>
                  <span className="block sm:inline sm:before:content-[':_']">
                    List your first club and get £5 credit.
                  </span>
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mowing-green text-off-white-pique">
                  <MessageCircle className="h-4 w-4" aria-hidden />
                </span>
                <p className="text-sm text-mowing-green/85">
                  <span className="font-semibold text-mowing-green">Shape Teevo</span>
                  <span className="block sm:inline sm:before:content-[':_']">
                    Founders get a voice in what we build next.
                  </span>
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Form card */}
        <section className="mx-auto mt-8 max-w-lg">
          <div className="rounded-2xl border border-mowing-green/10 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold text-mowing-green">Create your account</h2>
            <p className="mt-1 text-sm text-mowing-green/65">Takes around 30 seconds. No card required.</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {error && (
                <p className="rounded-lg bg-divot-pink/15 px-3 py-2 text-sm text-divot-pink" role="alert">
                  {error}
                </p>
              )}

              <div>
                <label htmlFor="signup-first-name" className="mb-1 block text-sm font-medium text-mowing-green">
                  First name
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mowing-green/45" aria-hidden />
                  <input
                    id="signup-first-name"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={loading}
                    placeholder="e.g. Alex"
                    autoComplete="given-name"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="signup-email" className="mb-1 block text-sm font-medium text-mowing-green">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mowing-green/45" aria-hidden />
                  <input
                    id="signup-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    autoComplete="email"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="signup-password" className="mb-1 block text-sm font-medium text-mowing-green">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mowing-green/45" aria-hidden />
                  <input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="new-password"
                    className={`${inputClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-mowing-green/50 hover:text-mowing-green focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mowing-green"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="signup-referral" className="mb-1 block text-sm font-medium text-mowing-green">
                  Referral code <span className="font-normal text-mowing-green/55">(optional)</span>
                </label>
                <div className="relative">
                  <Gift className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mowing-green/45" aria-hidden />
                  <input
                    id="signup-referral"
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    disabled={loading}
                    autoCapitalize="characters"
                    autoComplete="off"
                    placeholder="E.G. DAVID"
                    className={`${inputClass} uppercase`}
                  />
                </div>
                <p className="mt-1 text-xs text-mowing-green/55">If you were referred by a friend</p>
              </div>

              <div className="flex items-start gap-3">
                <input
                  id="accept-legal"
                  type="checkbox"
                  checked={acceptedLegal}
                  onChange={(e) => setAcceptedLegal(e.target.checked)}
                  disabled={loading}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-mowing-green/40 text-mowing-green focus:ring-mowing-green"
                />
                <label htmlFor="accept-legal" className="text-sm leading-snug text-mowing-green/90">
                  I agree to the{" "}
                  <Link href="/terms" className="font-medium text-par-3-punch hover:underline">
                    Terms &amp; Conditions
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="font-medium text-par-3-punch hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-mowing-green py-3.5 text-base font-semibold text-off-white-pique transition-opacity hover:opacity-95 disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mowing-green"
              >
                {founderActive ? "Claim my Founder spot" : "Create account"}
                {founderActive && <Sparkles className="h-4 w-4 text-golden-tee" aria-hidden />}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-mowing-green/80">
              Already have an account?{" "}
              <Link
                href={`/login?redirect=${encodeURIComponent(redirect)}`}
                className="font-medium text-par-3-punch hover:underline"
              >
                Log in
              </Link>
            </p>
          </div>
        </section>

        {/* Trust strip */}
        <section
          className="mx-auto mt-8 max-w-3xl rounded-2xl border border-mowing-green/10 bg-mowing-green/[0.04] px-4 py-4 sm:px-6"
          aria-label="Why join Teevo"
        >
          <ul className="grid gap-4 sm:grid-cols-3">
            <li className="flex items-start gap-2.5 text-sm text-mowing-green/85">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-mowing-green" aria-hidden />
              <span>No card required. Sign up in seconds.</span>
            </li>
            <li className="flex items-start gap-2.5 text-sm text-mowing-green/85">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-mowing-green" aria-hidden />
              <span>30 seconds. That&apos;s it.</span>
            </li>
            <li className="flex items-start gap-2.5 text-sm text-mowing-green/85">
              <Image
                src="/logo-icon.png"
                alt=""
                width={16}
                height={16}
                className="mt-0.5 h-4 w-4 shrink-0 object-contain"
              />
              <span>Built for golfers. By golfers.</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-md px-5 py-12 text-center text-mowing-green/80">Loading…</div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
