"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const GROUPS: { label: string; links: { href: string; label: string }[] }[] = [
  {
    label: "Operations",
    links: [
      { href: "/admin", label: "Overview" },
      { href: "/admin/listings/all", label: "Listings" },
      { href: "/admin/listings", label: "Verify listings" },
      { href: "/admin/packaging", label: "Verify packaging" },
      { href: "/admin/transactions", label: "Transactions" },
      { href: "/admin/starter-packs", label: "Starter Packs" },
      { href: "/admin/fulfilment", label: "Awaiting labels" },
    ],
  },
  {
    label: "Community",
    links: [
      { href: "/admin/users", label: "Users" },
      { href: "/admin/feedback", label: "Feedback" },
      { href: "/admin/referrals", label: "Referrals" },
      { href: "/admin/referrals/creators", label: "Creators" },
    ],
  },
  {
    label: "System",
    links: [{ href: "/admin/settings", label: "Settings" }],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/admin/listings/all") return pathname === "/admin/listings/all";
  if (href === "/admin/listings") {
    return pathname === "/admin/listings" || (pathname.startsWith("/admin/listings/") && pathname !== "/admin/listings/all");
  }
  if (href === "/admin/referrals") return pathname === "/admin/referrals";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 space-y-3 border-b border-par-3-punch/20 pb-4">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-mowing-green/50">{group.label}</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {group.links.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    active
                      ? "text-mowing-green font-semibold underline underline-offset-4"
                      : "text-mowing-green font-medium hover:underline"
                  }
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
