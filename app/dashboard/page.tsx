"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { OnboardingStripeBanner } from "@/components/dashboard/OnboardingStripeBanner";
import { ClipboardCheck, Package, PlusCircle, ShoppingBag, ShoppingCart, TrendingUp, User } from "lucide-react";

export default function DashboardPage() {
  const { user, profile, role, loading, refreshProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent("/dashboard")}`);
    }
  }, [user, loading, router]);

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
          className="flex items-center gap-4 rounded-xl border border-par-3-punch/20 bg-white p-4 hover:shadow-md transition-shadow"
        >
          <div className="rounded-lg bg-par-3-punch/20 p-3">
            <Package className="h-6 w-6 text-mowing-green" />
          </div>
          <div>
            <p className="font-semibold text-mowing-green">My listings</p>
            <p className="text-sm text-mowing-green/70">View and manage your items</p>
          </div>
        </Link>
        <Link
          href="/dashboard/sales"
          className="flex items-center gap-4 rounded-xl border border-par-3-punch/20 bg-white p-4 hover:shadow-md transition-shadow"
        >
          <div className="rounded-lg bg-par-3-punch/20 p-3">
            <TrendingUp className="h-6 w-6 text-mowing-green" />
          </div>
          <div>
            <p className="font-semibold text-mowing-green">Sales</p>
            <p className="text-sm text-mowing-green/70">Mark shipped, get paid</p>
          </div>
        </Link>
        <Link
          href="/dashboard/purchases"
          className="flex items-center gap-4 rounded-xl border border-par-3-punch/20 bg-white p-4 hover:shadow-md transition-shadow"
        >
          <div className="rounded-lg bg-par-3-punch/20 p-3">
            <ShoppingBag className="h-6 w-6 text-mowing-green" />
          </div>
          <div>
            <p className="font-semibold text-mowing-green">Purchases</p>
            <p className="text-sm text-mowing-green/70">Track orders, confirm receipt</p>
          </div>
        </Link>
        {role === "admin" && (
          <Link
            href="/dashboard/admin/packaging"
            className="flex items-center gap-4 rounded-xl border border-par-3-punch/20 bg-white p-4 hover:shadow-md transition-shadow"
          >
            <div className="rounded-lg bg-golden-tee/20 p-3">
              <ClipboardCheck className="h-6 w-6 text-mowing-green" />
            </div>
            <div>
              <p className="font-semibold text-mowing-green">Packaging review</p>
              <p className="text-sm text-mowing-green/70">Approve or reject seller photos (admin)</p>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
