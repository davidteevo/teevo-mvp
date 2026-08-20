"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  BadgeCheck,
  Briefcase,
  ClipboardCheck,
  Gift,
  LayoutDashboard,
  List,
  Megaphone,
  Package,
  Settings,
  ShoppingCart,
  Star,
  Tag,
  Users,
  UsersRound,
  Wrench,
} from "lucide-react";

const GROUPS: {
  label: string;
  icon: LucideIcon;
  chipClass: string;
  links: { href: string; label: string; icon: LucideIcon }[];
}[] = [
  {
    label: "Operations",
    icon: Briefcase,
    chipClass: "bg-golden-tee/20",
    links: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard },
      { href: "/admin/listings/all", label: "Listings", icon: List },
      { href: "/admin/listings", label: "Verify listings", icon: BadgeCheck },
      { href: "/admin/packaging", label: "Verify packaging", icon: ClipboardCheck },
      { href: "/admin/transactions", label: "Transactions", icon: ShoppingCart },
      { href: "/admin/starter-packs", label: "Starter Packs", icon: Package },
      { href: "/admin/fulfilment", label: "Awaiting labels", icon: Tag },
    ],
  },
  {
    label: "Community",
    icon: UsersRound,
    chipClass: "bg-par-3-punch/20",
    links: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/feedback", label: "Feedback", icon: Star },
      { href: "/admin/referrals", label: "Referrals", icon: Gift },
      { href: "/admin/founders", label: "Founders", icon: Award },
      { href: "/admin/referrals/creators", label: "Creators", icon: Megaphone },
    ],
  },
  {
    label: "System",
    icon: Wrench,
    chipClass: "bg-mowing-green/10",
    links: [{ href: "/admin/settings", label: "Settings", icon: Settings }],
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
      {GROUPS.map((group) => {
        const GroupIcon = group.icon;
        return (
          <div key={group.label}>
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-mowing-green/50">
              <span className={`inline-flex rounded-md p-1 ${group.chipClass}`}>
                <GroupIcon className="h-3 w-3 text-mowing-green" aria-hidden />
              </span>
              {group.label}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-2">
              {group.links.map((link) => {
                const active = isActive(pathname, link.href);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={
                      active
                        ? "inline-flex items-center gap-2 text-mowing-green font-semibold underline underline-offset-4"
                        : "inline-flex items-center gap-2 text-mowing-green font-medium hover:underline"
                    }
                  >
                    <span className={`inline-flex shrink-0 rounded-lg p-1.5 ${group.chipClass}`}>
                      <Icon className="h-4 w-4 text-mowing-green" aria-hidden />
                    </span>
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
