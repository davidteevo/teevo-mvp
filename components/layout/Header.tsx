"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, ChevronDown, LayoutDashboard, Settings, LogOut, ShoppingCart, Tag, LayoutGrid, Shield, User } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

const AVATAR_BUCKET = "avatars";
function avatarUrl(path: string | null): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${AVATAR_BUCKET}/${path}`;
}

const nav = [
  { href: "/", label: "Browse" },
  { href: "/sell", label: "Sell" },
  { href: "/dashboard", label: "Dashboard" },
];

export function Header() {
  const pathname = usePathname();
  const { user, profile, role, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-off-white-pique border-b border-par-3-punch/20">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image
            src="/logo-text.png"
            alt="Teevo"
            width={140}
            height={44}
            className="h-9 w-auto"
            priority
          />
        </Link>

        <nav className="hidden sm:flex items-center gap-6">
          {nav.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm font-medium ${
                pathname === href ? "text-mowing-green" : "text-mowing-green/80 hover:text-mowing-green"
              }`}
            >
              {label}
            </Link>
          ))}
          {role === "admin" && (
            <Link
              href="/admin"
              className="text-sm font-medium text-divot-pink hover:underline"
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="relative hidden sm:flex items-center gap-1" ref={accountRef}>
              <Link
                href="/dashboard"
                className="rounded-full overflow-hidden ring-2 ring-transparent hover:ring-mowing-green/30 transition-shadow focus:outline-none focus:ring-2 focus:ring-mowing-green"
                aria-label="Go to dashboard"
              >
                {avatarUrl(profile?.avatar_path ?? null) ? (
                  <img
                    src={avatarUrl(profile?.avatar_path ?? null)!}
                    alt=""
                    className="h-9 w-9 object-cover"
                  />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mowing-green/20 text-mowing-green font-semibold text-sm">
                    {(profile?.display_name || user.email || "?").charAt(0).toUpperCase()}
                  </span>
                )}
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
                <div className="absolute right-0 top-full mt-1 py-1 min-w-[140px] rounded-lg border border-par-3-punch/20 bg-white shadow-lg z-50">
                  <Link
                    href="/dashboard/profile"
                    className="block px-4 py-2 text-sm text-mowing-green hover:bg-mowing-green/5"
                    onClick={() => setAccountOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    className="block px-4 py-2 text-sm text-mowing-green hover:bg-mowing-green/5"
                    onClick={() => setAccountOpen(false)}
                  >
                    Settings
                  </Link>
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
              <Link
                href="/login"
                className="text-sm font-medium text-mowing-green hover:underline"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-mowing-green text-off-white-pique px-4 py-2 text-sm font-medium hover:opacity-90"
              >
                Sign up
              </Link>
            </>
          )}

          {user && (
            <Link
              href="/dashboard"
              className="sm:hidden rounded-full overflow-hidden ring-2 ring-transparent hover:ring-mowing-green/30"
              aria-label="Go to dashboard"
            >
              {avatarUrl(profile?.avatar_path ?? null) ? (
                <img
                  src={avatarUrl(profile?.avatar_path ?? null)!}
                  alt=""
                  className="h-9 w-9 object-cover"
                />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mowing-green/20 text-mowing-green font-semibold text-sm">
                  {(profile?.display_name || user.email || "?").charAt(0).toUpperCase()}
                </span>
              )}
            </Link>
          )}
          <button
            type="button"
            className="sm:hidden p-2 text-mowing-green"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="sm:hidden border-t border-par-3-punch/20 bg-white shadow-lg">
          <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-1">
            {user && (
              <>
                <div className="rounded-xl bg-mowing-green/5 border border-mowing-green/10 p-3 mb-2">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-3 py-1"
                    onClick={() => setMenuOpen(false)}
                  >
                    {avatarUrl(profile?.avatar_path ?? null) ? (
                      <img
                        src={avatarUrl(profile?.avatar_path ?? null)!}
                        alt=""
                        className="h-12 w-12 rounded-full object-cover ring-2 ring-white shadow-sm"
                      />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-mowing-green/20 text-mowing-green font-semibold text-lg ring-2 ring-white shadow-sm">
                        {(profile?.display_name || user.email || "?").charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-mowing-green truncate">
                        {profile?.display_name?.trim() || user.email || "Dashboard"}
                      </p>
                      <p className="text-xs text-mowing-green/60 truncate">Tap to open dashboard</p>
                    </div>
                    <LayoutDashboard className="h-5 w-5 text-mowing-green/50 shrink-0" />
                  </Link>
                </div>
                <Link
                  href="/dashboard/profile"
                  className="flex items-center gap-3 rounded-lg py-3 px-3 text-mowing-green font-medium hover:bg-mowing-green/5 active:bg-mowing-green/10 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-mowing-green/10">
                    <User className="h-4 w-4 text-mowing-green" />
                  </span>
                  Profile
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-3 rounded-lg py-3 px-3 text-mowing-green font-medium hover:bg-mowing-green/5 active:bg-mowing-green/10 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-mowing-green/10">
                    <Settings className="h-4 w-4 text-mowing-green" />
                  </span>
                  Settings
                </Link>
                <button
                  type="button"
                  disabled={signingOut}
                  onClick={async () => {
                    setMenuOpen(false);
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
                <div className="my-2 h-px bg-par-3-punch/20" />
              </>
            )}
            <p className="px-3 pt-1 pb-1 text-xs font-semibold uppercase tracking-wider text-mowing-green/50">
              Menu
            </p>
            {nav.map(({ href, label }) => {
              const Icon = href === "/" ? ShoppingCart : href === "/sell" ? Tag : LayoutGrid;
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 rounded-lg py-3 px-3 text-mowing-green font-medium hover:bg-mowing-green/5 active:bg-mowing-green/10 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-par-3-punch/15">
                    <Icon className="h-4 w-4 text-mowing-green" />
                  </span>
                  {label}
                </Link>
              );
            })}
            {role === "admin" && (
              <>
                <div className="my-2 h-px bg-par-3-punch/20" />
                <Link
                  href="/admin"
                  className="flex items-center gap-3 rounded-lg py-3 px-3 text-divot-pink font-medium hover:bg-divot-pink/10 active:bg-divot-pink/15 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-divot-pink/15">
                    <Shield className="h-4 w-4 text-divot-pink" />
                  </span>
                  Admin
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
