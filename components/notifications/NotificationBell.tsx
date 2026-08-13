"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function NotificationBell() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  const load = useCallback(() => {
    fetch("/api/notifications/unread-count")
      .then((r) => (r.ok ? r.json() : { count: 0 }))
      .then((data) => setCount(typeof data.count === "number" ? data.count : 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load, pathname]);

  const label = count > 0 ? `${count > 9 ? "9+" : count} unread notifications` : "Notifications";
  const badge = count > 9 ? "9+" : String(count);

  return (
    <Link
      href="/notifications"
      className="relative p-2 text-mowing-green hover:text-mowing-green rounded-lg focus:outline-none focus:ring-2 focus:ring-mowing-green"
      aria-label={label}
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-divot-pink text-mowing-green text-[10px] font-semibold flex items-center justify-center px-1">
          {badge}
        </span>
      )}
    </Link>
  );
}
