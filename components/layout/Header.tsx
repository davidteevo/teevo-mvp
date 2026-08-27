"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Menu, X, ChevronDown, Settings, LogOut, ShoppingCart,
  Shield, User, Bell, Heart, Gift, Plus, ListFilter, ShoppingBag,
  HelpCircle, BarChart2, LayoutDashboard, Sparkles,
} from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

const AVATAR_BUCKET = "avatars";

function avatarApiSrc(avatarPath: string | null | undefined, retryKey?: number): string | null {
  if (!avatarPath) return null;
  return retryKey != null ? `/api/user/avatar?r=${retryKey}` : "/api/user/avatar";
}

function avatarPublicSrc(avatarPath: string | null | undefined): string | null {
  if (!avatarPath || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${AVATAR_BUCKET}/${avatarPath}`;
}

const desktopNav = [
  { href: "/", label: "Browse" },
  { href: "/sell", label: "Sell" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/conversations", label: "Messages" },
];

function MenuDivider() {
  return <div className="my-2 h-px bg-par-3-punch/20" aria-hidden />;
}

export function Header() {
  const pathname = usePathname();
  const { user, profile, role, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [avatarRetry, setAvatarRetry] = useState(0);
  const [avatarError, setAvatarError] = useState(false);
  const [publicAvatarError, setPublicAvatarError] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [actionCount, setActionCount] = useState(0);
  const [isCreator, setIsCreator] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const scrollLockYRef = useRef(0);
  const usePublicAvatar = avatarError && avatarRetry >= 1;

  useEffect(() => {
    setAvatarError(false);
    setPublicAvatarError(false);
  }, [profile?.id, profile?.avatar_path]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  useEffect(() => {
    if (!user) {
      setIsCreator(false);
      return;
    }
    fetch("/api/creator/status")
      .then((r) => (r.ok ? r.json() : { isCreator: false }))
      .then((data) => setIsCreator(data.isCreator === true))
      .catch(() => setIsCreator(false));
  }, [user, pathname]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/notifications/unread-count")
      .then((r) => (r.ok ? r.json() : { count: 0 }))
      .then((data) => setUnreadCount(typeof data.count === "number" ? data.count : 0))
      .catch(() => {});
    fetch("/api/notifications/action-count")
      .then((r) => (r.ok ? r.json() : { count: 0 }))
      .then((data) => setActionCount(typeof data.count === "number" ? data.count : 0))
      .catch(() => {});
  }, [user, pathname]);

  // Lock background page scroll while mobile menu is open (iOS-safe).
  useEffect(() => {
    if (!menuOpen) return;
    const body = document.body;
    const html = document.documentElement;
    scrollLockYRef.current = window.scrollY;
    const y = scrollLockYRef.current;
    const prev = {
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      htmlOverflow: html.style.overflow,
    };
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    body.style.width = "100%";
    html.style.overflow = "hidden";

    return () => {
      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.width = prev.bodyWidth;
      html.style.overflow = prev.htmlOverflow;
      window.scrollTo(0, y);
    };
  }, [menuOpen]);

  function AvatarImg({ className }: { className: string }) {
    if (profile?.avatar_path && !(avatarError && !usePublicAvatar) && !publicAvatarError) {
      return (
        <img
          src={(usePublicAvatar ? avatarPublicSrc(profile.avatar_path) : avatarApiSrc(profile.avatar_path, avatarRetry)) ?? ""}
          alt=""
          className={className}
          onError={() => {
            if (usePublicAvatar) {
              setPublicAvatarError(true);
            } else {
              setAvatarError(true);
              setTimeout(() => {
                setAvatarRetry((r) => r + 1);
                setAvatarError(false);
              }, 800);
            }
          }}
        />
      );
    }
    return (
      <span className={`flex items-center justify-center rounded-full bg-mowing-green/20 text-mowing-green font-semibold ${className}`}>
        {(profile?.display_name || user?.email || "?").charAt(0).toUpperCase()}
      </span>
    );
  }

  const close = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 bg-off-white-pique border-b border-par-3-punch/20">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image src="/logo-text.png" alt="Teevo" width={140} height={44} className="h-9 w-auto" priority />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-6">
          {desktopNav.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm font-medium ${pathname === href ? "text-mowing-green" : "text-mowing-green/80 hover:text-mowing-green"}`}
            >
              {label}
            </Link>
          ))}
          {role === "admin" && (
            <Link href="/admin" className="text-sm font-medium text-divot-pink hover:underline">
              Admin
            </Link>
          )}
        </nav>

        {/* Desktop right controls */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden sm:block">
              <NotificationBell />
            </div>
          )}
          {user ? (
            <div className="relative hidden sm:flex items-center gap-1" ref={accountRef}>
              <Link
                href="/dashboard"
                className="rounded-full overflow-hidden ring-2 ring-transparent hover:ring-mowing-green/30 transition-shadow focus:outline-none focus:ring-2 focus:ring-mowing-green"
                aria-label="Go to dashboard"
              >
                <AvatarImg className="h-9 w-9 object-cover" />
              </Link>
              <button
                type="button"
                onClick={() => setAccountOpen((o) => !o)}
                className="p-1 text-mowing-green/80 hover:text-mowing-green rounded"
                aria-label="Account menu"
                aria-expanded={accountOpen}
              >
                <ChevronDown className={`h-5 w-5 transition-transform ${accountOpen ? "rotate-180" : ""}`} />
              </button>
              {accountOpen && (
                <div className="absolute right-0 top-full mt-1 py-1 min-w-[160px] rounded-lg border border-par-3-punch/20 bg-white shadow-lg z-50">
                  <Link href="/dashboard/listings" className="block px-4 py-2 text-sm text-mowing-green hover:bg-mowing-green/5" onClick={() => setAccountOpen(false)}>My Listings</Link>
                  <Link href="/dashboard/purchases" className="block px-4 py-2 text-sm text-mowing-green hover:bg-mowing-green/5" onClick={() => setAccountOpen(false)}>My Purchases</Link>
                  <Link href="/watchlist" className="block px-4 py-2 text-sm text-mowing-green hover:bg-mowing-green/5" onClick={() => setAccountOpen(false)}>Watchlist</Link>
                  <Link href="/dashboard/referrals" className="block px-4 py-2 text-sm text-mowing-green hover:bg-mowing-green/5" onClick={() => setAccountOpen(false)}>Refer a Friend</Link>
                  {isCreator && (
                    <Link href="/dashboard/creator" className="block px-4 py-2 text-sm text-mowing-green hover:bg-mowing-green/5" onClick={() => setAccountOpen(false)}>Creator Hub</Link>
                  )}
                  <div className="my-1 h-px bg-par-3-punch/20" />
                  <Link href="/dashboard/profile" className="block px-4 py-2 text-sm text-mowing-green hover:bg-mowing-green/5" onClick={() => setAccountOpen(false)}>Profile</Link>
                  <Link href="/dashboard/settings" className="block px-4 py-2 text-sm text-mowing-green hover:bg-mowing-green/5" onClick={() => setAccountOpen(false)}>Settings</Link>
                  <Link href="/support" className="block px-4 py-2 text-sm text-mowing-green hover:bg-mowing-green/5" onClick={() => setAccountOpen(false)}>Help & Support</Link>
                  <div className="my-1 h-px bg-par-3-punch/20" />
                  <button
                    type="button"
                    disabled={signingOut}
                    onClick={async () => {
                      setAccountOpen(false);
                      setSigningOut(true);
                      await signOut();
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-mowing-green hover:bg-mowing-green/5 disabled:opacity-70"
                  >
                    {signingOut ? "Signing out…" : "Sign out"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="hidden sm:inline text-sm font-medium text-mowing-green hover:underline">
                Log in
              </Link>
              <Link href="/signup" className="hidden sm:inline rounded-lg bg-mowing-green text-off-white-pique px-4 py-2 text-sm font-medium hover:opacity-90">
                Sign up
              </Link>
            </>
          )}

          {user && !menuOpen && (
            <div className="sm:hidden">
              <NotificationBell />
            </div>
          )}
          {user && (
            <Link
              href="/dashboard"
              className="sm:hidden rounded-full overflow-hidden ring-2 ring-transparent hover:ring-mowing-green/30"
              aria-label="Go to dashboard"
            >
              <AvatarImg className="h-9 w-9 object-cover" />
            </Link>
          )}
          <button
            type="button"
            className="sm:hidden p-2 text-mowing-green"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile full-screen menu */}
      {menuOpen && (
        <div
          className="sm:hidden fixed inset-0 z-[60] flex flex-col bg-white"
          style={{ height: "100dvh" }}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          {/* Menu header */}
          <div className="flex shrink-0 items-center justify-between border-b border-par-3-punch/20 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <Link href="/" className="flex items-center gap-2 shrink-0" onClick={close}>
              <Image src="/logo-text.png" alt="Teevo" width={140} height={44} className="h-9 w-auto" />
            </Link>
            <button type="button" className="p-2 text-mowing-green" onClick={close} aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable menu body */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 [-webkit-overflow-scrolling:touch] pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto flex max-w-6xl flex-col gap-1">

              {user ? (
                <>
                  {/* Profile card — avatar → profile, row → dashboard */}
                  <div className="rounded-xl bg-mowing-green/5 border border-mowing-green/10 p-3 mb-2">
                    <div className="flex items-center gap-3">
                      <Link
                        href="/dashboard/profile"
                        className="shrink-0 rounded-full overflow-hidden ring-2 ring-white shadow-sm hover:ring-mowing-green/30 transition-shadow"
                        onClick={close}
                        aria-label="Open profile"
                      >
                        <AvatarImg className="h-12 w-12 object-cover rounded-full" />
                      </Link>
                      <Link
                        href="/dashboard"
                        className="flex min-w-0 flex-1 items-center gap-2 py-1"
                        onClick={close}
                        aria-label="Open dashboard"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-mowing-green truncate">
                            {profile?.display_name?.trim() || user.email || "Dashboard"}
                          </p>
                          <p className="text-xs text-mowing-green/60 truncate">Tap to open dashboard</p>
                        </div>
                        <LayoutDashboard className="h-5 w-5 text-mowing-green/50 shrink-0" />
                      </Link>
                    </div>
                  </div>

                  {/* ── Marketplace ── */}
                  <Link
                    href="/"
                    className="flex items-center gap-3 rounded-lg py-3 px-3 text-mowing-green font-medium hover:bg-mowing-green/5 active:bg-mowing-green/10 transition-colors"
                    onClick={close}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-par-3-punch/15">
                      <ShoppingCart className="h-4 w-4 text-mowing-green" />
                    </span>
                    Browse Clubs
                  </Link>

                  {/* Sell a Club — visually prioritised */}
                  <Link
                    href="/sell"
                    className="flex items-center gap-3 rounded-xl py-3 px-3 bg-mowing-green/8 border border-mowing-green/20 text-mowing-green font-semibold hover:bg-mowing-green/12 active:bg-mowing-green/20 transition-colors"
                    onClick={close}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-mowing-green text-white">
                      <Plus className="h-4 w-4" />
                    </span>
                    Sell a club
                  </Link>

                  {/* My Listings with action count */}
                  <Link
                    href="/dashboard/listings"
                    className="flex items-center gap-3 rounded-lg py-3 px-3 text-mowing-green font-medium hover:bg-mowing-green/5 active:bg-mowing-green/10 transition-colors"
                    onClick={close}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-par-3-punch/15">
                      <ListFilter className="h-4 w-4 text-mowing-green" />
                    </span>
                    <span className="flex-1 min-w-0">
                      My listings
                      {actionCount > 0 && (
                        <span className="ml-2 inline-flex items-center text-xs font-medium text-divot-pink">
                          · {actionCount} need action
                        </span>
                      )}
                    </span>
                  </Link>

                  <Link
                    href="/dashboard/purchases"
                    className="flex items-center gap-3 rounded-lg py-3 px-3 text-mowing-green font-medium hover:bg-mowing-green/5 active:bg-mowing-green/10 transition-colors"
                    onClick={close}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-par-3-punch/15">
                      <ShoppingBag className="h-4 w-4 text-mowing-green" />
                    </span>
                    My purchases
                  </Link>

                  <Link
                    href="/watchlist"
                    className="flex items-center gap-3 rounded-lg py-3 px-3 text-mowing-green font-medium hover:bg-mowing-green/5 active:bg-mowing-green/10 transition-colors"
                    onClick={close}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-par-3-punch/15">
                      <Heart className="h-4 w-4 text-mowing-green" />
                    </span>
                    Watchlist
                  </Link>

                  <Link
                    href="/dashboard/referrals"
                    className="flex items-center gap-3 rounded-lg py-3 px-3 text-mowing-green font-medium hover:bg-mowing-green/5 active:bg-mowing-green/10 transition-colors"
                    onClick={close}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-par-3-punch/15">
                      <Gift className="h-4 w-4 text-mowing-green" />
                    </span>
                    Refer a Friend
                  </Link>

                  {isCreator && (
                    <Link
                      href="/dashboard/creator"
                      className="flex items-center gap-3 rounded-lg py-3 px-3 text-mowing-green font-medium hover:bg-mowing-green/5 active:bg-mowing-green/10 transition-colors"
                      onClick={close}
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-golden-tee/30">
                        <Sparkles className="h-4 w-4 text-mowing-green" />
                      </span>
                      Creator Hub
                    </Link>
                  )}

                  <MenuDivider />

                  {/* ── Account Activity ── */}
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-3 rounded-lg py-3 px-3 text-mowing-green font-medium hover:bg-mowing-green/5 active:bg-mowing-green/10 transition-colors"
                    onClick={close}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-mowing-green/10">
                      <BarChart2 className="h-4 w-4 text-mowing-green" />
                    </span>
                    Dashboard
                  </Link>

                  <Link
                    href="/notifications"
                    className="flex items-center gap-3 rounded-lg py-3 px-3 text-mowing-green font-medium hover:bg-mowing-green/5 active:bg-mowing-green/10 transition-colors"
                    onClick={close}
                  >
                    <span className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-mowing-green/10">
                      <Bell className="h-4 w-4 text-mowing-green" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full bg-divot-pink text-white text-[9px] font-semibold flex items-center justify-center px-1">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </span>
                    Notifications
                  </Link>

                  <Link
                    href="/dashboard/profile"
                    className="flex items-center gap-3 rounded-lg py-3 px-3 text-mowing-green font-medium hover:bg-mowing-green/5 active:bg-mowing-green/10 transition-colors"
                    onClick={close}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-mowing-green/10">
                      <User className="h-4 w-4 text-mowing-green" />
                    </span>
                    Profile
                  </Link>

                  <MenuDivider />

                  {/* ── Account ── */}
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-3 rounded-lg py-3 px-3 text-mowing-green font-medium hover:bg-mowing-green/5 active:bg-mowing-green/10 transition-colors"
                    onClick={close}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-mowing-green/10">
                      <Settings className="h-4 w-4 text-mowing-green" />
                    </span>
                    Settings
                  </Link>

                  <Link
                    href="/support"
                    className="flex items-center gap-3 rounded-lg py-3 px-3 text-mowing-green font-medium hover:bg-mowing-green/5 active:bg-mowing-green/10 transition-colors"
                    onClick={close}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-mowing-green/10">
                      <HelpCircle className="h-4 w-4 text-mowing-green" />
                    </span>
                    Help &amp; Support
                  </Link>

                  <button
                    type="button"
                    disabled={signingOut}
                    onClick={async () => {
                      close();
                      setSigningOut(true);
                      await signOut();
                    }}
                    className="flex items-center gap-3 rounded-lg py-3 px-3 text-mowing-green/80 font-medium hover:bg-divot-pink/10 active:bg-divot-pink/15 disabled:opacity-70 transition-colors text-left w-full"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-mowing-green/10">
                      <LogOut className="h-4 w-4 text-mowing-green/80" />
                    </span>
                    {signingOut ? "Signing out…" : "Sign out"}
                  </button>

                  {role === "admin" && (
                    <>
                      <MenuDivider />
                      <Link
                        href="/admin"
                        className="flex items-center gap-3 rounded-lg py-3 px-3 text-divot-pink font-medium hover:bg-divot-pink/10 active:bg-divot-pink/15 transition-colors"
                        onClick={close}
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-divot-pink/15">
                          <Shield className="h-4 w-4 text-divot-pink" />
                        </span>
                        Admin
                      </Link>
                    </>
                  )}
                </>
              ) : (
                /* ── Logged-out menu ── */
                <>
                  <Link
                    href="/"
                    className="flex items-center gap-3 rounded-lg py-3 px-3 text-mowing-green font-medium hover:bg-mowing-green/5 active:bg-mowing-green/10 transition-colors"
                    onClick={close}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-par-3-punch/15">
                      <ShoppingCart className="h-4 w-4 text-mowing-green" />
                    </span>
                    Browse Clubs
                  </Link>

                  <Link
                    href="/sell"
                    className="flex items-center gap-3 rounded-xl py-3 px-3 bg-mowing-green/8 border border-mowing-green/20 text-mowing-green font-semibold hover:bg-mowing-green/12 active:bg-mowing-green/20 transition-colors"
                    onClick={close}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-mowing-green text-white">
                      <Plus className="h-4 w-4" />
                    </span>
                    Sell a club
                  </Link>

                  <MenuDivider />

                  <Link
                    href="/login"
                    className="flex items-center gap-3 rounded-lg py-3 px-3 text-mowing-green font-medium hover:bg-mowing-green/5 active:bg-mowing-green/10 transition-colors"
                    onClick={close}
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="mt-1 flex items-center justify-center rounded-xl bg-mowing-green px-3 py-3 text-sm font-semibold text-off-white-pique hover:opacity-90"
                    onClick={close}
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
