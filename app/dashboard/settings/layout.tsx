"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Package } from "lucide-react";

const tabs = [
  { href: "/dashboard/settings/payments", label: "Payments", icon: CreditCard },
  { href: "/dashboard/settings/postage", label: "Postage", icon: Package },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-mowing-green">Settings</h1>
      <p className="mt-1 text-mowing-green/80 text-sm">
        Manage payments and postage details.
      </p>

      <nav className="mt-6 flex gap-1 rounded-xl border border-mowing-green/20 bg-mowing-green/5 p-1" aria-label="Settings tabs">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive ? "bg-white text-mowing-green shadow-sm" : "text-mowing-green/80 hover:text-mowing-green hover:bg-white/50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8">{children}</div>
    </div>
  );
}
