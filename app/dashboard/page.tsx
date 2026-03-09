"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { OnboardingStripeBanner } from "@/components/dashboard/OnboardingStripeBanner";
import { Calendar, ClipboardCheck, MessageCircle, Package, PlusCircle, Send, ShoppingBag, ShoppingCart, TrendingUp, User } from "lucide-react";

function FoundingSellerFeedback() {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const bookCallUrl = process.env.NEXT_PUBLIC_BOOK_CALL_URL;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to send");
        return;
      }
      setSent(true);
      setMessage("");
    } catch {
      setError("Something went wrong");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl border border-mowing-green/30 bg-mowing-green/5 p-3 sm:p-4">
      <p className="text-mowing-green font-medium text-sm sm:text-base mb-2">You&apos;re a founding member — we&apos;d love your feedback.</p>
      <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-3">
        <form onSubmit={handleSubmit} className="flex-1 min-w-0 flex flex-col gap-1.5">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Quick message or book a call below…"
            rows={2}
            maxLength={5000}
            disabled={sending}
            className="w-full rounded-lg border border-mowing-green/30 bg-white px-3 py-2 text-sm text-mowing-green placeholder:text-mowing-green/50 resize-y disabled:opacity-60"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-mowing-green text-off-white-pique px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-3.5 w-3.5" />
              {sending ? "Sending…" : "Send"}
            </button>
            {bookCallUrl && (
              <a
                href={bookCallUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-mowing-green/50 text-mowing-green px-3 py-2 text-sm font-medium hover:bg-mowing-green/10"
              >
                <Calendar className="h-3.5 w-3.5" />
                Book 15‑min call
              </a>
            )}
          </div>
        </form>
      </div>
      {sent && <p className="text-xs text-mowing-green mt-1.5" role="status">Thanks, we got it.</p>}
      {error && <p className="text-xs text-divot-pink mt-1.5" role="alert">{error}</p>}
    </div>
  );
}

type DashboardCounts = { listings: number; sales: number; purchases: number; conversations: number } | null;

export default function DashboardPage() {
  const { user, profile, role, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [counts, setCounts] = useState<DashboardCounts>(null);
  const [edited, setEdited] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent("/dashboard")}`);
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("edited") === "1") {
      setEdited(true);
      window.history.replaceState({}, "", "/dashboard");
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchCounts = () => {
      Promise.all([
        fetch("/api/listings/mine").then((r) => r.json().then((d) => (d.listings ?? []).length)),
        fetch("/api/transactions?role=seller").then((r) => r.json().then((d) => (d.transactions ?? []).length)),
        fetch("/api/transactions?role=buyer").then((r) => r.json().then((d) => (d.transactions ?? []).length)),
        fetch("/api/conversations").then((r) => r.json().then((d) => (d.conversations ?? []).length)),
      ])
        .then(([listings, sales, purchases, conversations]) => setCounts({ listings, sales, purchases, conversations }))
        .catch(() => setCounts(null));
    };
    fetchCounts();
    window.addEventListener("focus", fetchCounts);
    return () => window.removeEventListener("focus", fetchCounts);
  }, [user]);

  // After Stripe redirect (?stripe=return), force-refresh profile so avatar and info load reliably
  useEffect(() => {
    if (typeof window === "undefined" || !user) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe") === "return") {
      refreshProfile();
    }
  }, [user, refreshProfile]);

  if (loading || !user) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center px-4 py-12">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-2 border-mowing-green/15" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-mowing-green border-r-mowing-green/40 animate-spin" style={{ animationDuration: "0.9s" }} />
        </div>
        <p className="mt-4 font-medium text-mowing-green">Loading your dashboard</p>
        <p className="mt-1 text-sm text-mowing-green/60">Just a moment…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-mowing-green">Dashboard</h1>
      <p className="mt-1 text-mowing-green/80">Buy and sell from one account. Manage your listings and activity.</p>

      <OnboardingStripeBanner className="mt-6" />

      {edited && (
        <div className="mt-6 rounded-xl border border-par-3-punch/30 bg-par-3-punch/5 p-4 text-sm text-mowing-green">
          Listing changes saved. We&apos;ll review again and get back to you.
        </div>
      )}

      {(role === "seller" || role === "admin") && (
        <div className="mt-6">
          <FoundingSellerFeedback />
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-4 rounded-xl border border-par-3-punch/20 bg-white p-4 hover:shadow-md transition-shadow"
        >
          <div className="rounded-lg bg-mowing-green/10 p-3">
            <User className="h-6 w-6 text-mowing-green" />
          </div>
          <div>
            <p className="font-semibold text-mowing-green">Profile</p>
            <p className="text-sm text-mowing-green/70">Photo, location, handicap</p>
          </div>
        </Link>
        <Link
          href="/conversations"
          className="flex items-center gap-4 rounded-xl border border-par-3-punch/20 bg-white p-4 hover:shadow-md transition-shadow relative"
        >
          <div className="rounded-lg bg-par-3-punch/20 p-3">
            <MessageCircle className="h-6 w-6 text-mowing-green" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-mowing-green">Messages</p>
            <p className="text-sm text-mowing-green/70">Chat with buyers and sellers</p>
          </div>
          {counts != null && counts.conversations > 0 && (
            <span className="shrink-0 rounded-full bg-mowing-green/20 text-mowing-green px-2.5 py-0.5 text-sm font-medium">
              {counts.conversations}
            </span>
          )}
        </Link>
        <Link
          href="/"
          className="flex items-center gap-4 rounded-xl border border-par-3-punch/20 bg-white p-4 hover:shadow-md transition-shadow"
        >
          <div className="rounded-lg bg-par-3-punch/20 p-3">
            <ShoppingCart className="h-6 w-6 text-mowing-green" />
          </div>
          <div>
            <p className="font-semibold text-mowing-green">Buy</p>
            <p className="text-sm text-mowing-green/70">Browse verified listings</p>
          </div>
        </Link>
        <Link
          href="/sell"
          className="flex items-center gap-4 rounded-xl border border-par-3-punch/20 bg-white p-4 hover:shadow-md transition-shadow"
        >
          <div className="rounded-lg bg-golden-tee/20 p-3">
            <PlusCircle className="h-6 w-6 text-mowing-green" />
          </div>
          <div>
            <p className="font-semibold text-mowing-green">Sell</p>
            <p className="text-sm text-mowing-green/70">List an item</p>
          </div>
        </Link>
        <Link
          href="/dashboard/listings"
          className="flex items-center gap-4 rounded-xl border border-par-3-punch/20 bg-white p-4 hover:shadow-md transition-shadow relative"
        >
          <div className="rounded-lg bg-par-3-punch/20 p-3">
            <Package className="h-6 w-6 text-mowing-green" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-mowing-green">My listings</p>
            <p className="text-sm text-mowing-green/70">View and manage your items</p>
          </div>
          {counts != null && counts.listings > 0 && (
            <span className="shrink-0 rounded-full bg-mowing-green/20 text-mowing-green px-2.5 py-0.5 text-sm font-medium">
              {counts.listings}
            </span>
          )}
        </Link>
        <Link
          href="/dashboard/sales"
          className="flex items-center gap-4 rounded-xl border border-par-3-punch/20 bg-white p-4 hover:shadow-md transition-shadow relative"
        >
          <div className="rounded-lg bg-par-3-punch/20 p-3">
            <TrendingUp className="h-6 w-6 text-mowing-green" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-mowing-green">Sales</p>
            <p className="text-sm text-mowing-green/70">Mark shipped, get paid</p>
          </div>
          {counts != null && counts.sales > 0 && (
            <span className="shrink-0 rounded-full bg-mowing-green/20 text-mowing-green px-2.5 py-0.5 text-sm font-medium">
              {counts.sales}
            </span>
          )}
        </Link>
        <Link
          href="/dashboard/purchases"
          className="flex items-center gap-4 rounded-xl border border-par-3-punch/20 bg-white p-4 hover:shadow-md transition-shadow relative"
        >
          <div className="rounded-lg bg-par-3-punch/20 p-3">
            <ShoppingBag className="h-6 w-6 text-mowing-green" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-mowing-green">Purchases</p>
            <p className="text-sm text-mowing-green/70">Track orders, confirm receipt</p>
          </div>
          {counts != null && counts.purchases > 0 && (
            <span className="shrink-0 rounded-full bg-mowing-green/20 text-mowing-green px-2.5 py-0.5 text-sm font-medium">
              {counts.purchases}
            </span>
          )}
        </Link>
        {role === "admin" && (
          <>
            <Link
              href="/admin/listings"
              className="flex items-center gap-4 rounded-xl border border-par-3-punch/20 bg-white p-4 hover:shadow-md transition-shadow"
            >
              <div className="rounded-lg bg-golden-tee/20 p-3">
                <Package className="h-6 w-6 text-mowing-green" />
              </div>
              <div>
                <p className="font-semibold text-mowing-green">Verify listings (go live)</p>
                <p className="text-sm text-mowing-green/70">Approve items for the platform (admin)</p>
              </div>
            </Link>
            <Link
              href="/dashboard/admin/packaging"
              className="flex items-center gap-4 rounded-xl border border-par-3-punch/20 bg-white p-4 hover:shadow-md transition-shadow"
            >
              <div className="rounded-lg bg-golden-tee/20 p-3">
                <ClipboardCheck className="h-6 w-6 text-mowing-green" />
              </div>
              <div>
                <p className="font-semibold text-mowing-green">Verify packaging (shipping)</p>
                <p className="text-sm text-mowing-green/70">Approve seller photos before ship (admin)</p>
              </div>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
