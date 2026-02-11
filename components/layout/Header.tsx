"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

const nav = [
  { href: "/", label: "Browse" },
  { href: "/sell", label: "Sell" },
  { href: "/dashboard", label: "Dashboard" },
];

export function Header() {
  const pathname = usePathname();
  const { user, role, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

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
            <>
              <span className="hidden sm:inline text-sm text-mowing-green/80 truncate max-w-[120px]">
                {user.email}
              </span>
              <button
                type="button"
                onClick={() => signOut()}
                className="text-sm font-medium text-mowing-green hover:underline"
              >
                Sign out
              </button>
            </>
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
        <div className="sm:hidden border-t border-par-3-punch/20 bg-off-white-pique px-4 py-3 flex flex-col gap-2">
          {nav.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm font-medium text-mowing-green"
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
          {role === "admin" && (
            <Link href="/admin" className="text-sm font-medium text-divot-pink" onClick={() => setMenuOpen(false)}>
              Admin
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
