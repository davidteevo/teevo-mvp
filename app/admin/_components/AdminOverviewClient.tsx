"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminActionFilter,
  countAdminActions,
  filterAdminActions,
  type AdminActionFilterValue,
  type AdminActionItem,
} from "@/lib/admin-action-centre";
import type { AdminActionCentrePayload } from "@/lib/admin-action-centre";
import type { AdminBusinessMetrics, AdminExceptionItem } from "@/lib/admin-action-centre-data";
import { AdminActionFilters } from "./AdminActionFilters";
import { AdminActionCentreList } from "./AdminActionCentreList";
import { AdminActionReviewDrawer } from "./AdminActionReviewDrawer";
import { AdminBusinessMetricsRow } from "./AdminBusinessMetrics";
import { AdminExceptions } from "./AdminExceptions";
import { AdminQuickTools } from "./AdminQuickTools";

const FILTER_KEY = "teevo-admin-action-filter";

function readStoredFilter(): AdminActionFilterValue {
  if (typeof window === "undefined") return AdminActionFilter.ALL;
  const stored = sessionStorage.getItem(FILTER_KEY);
  const allowed = new Set(Object.values(AdminActionFilter));
  return stored && allowed.has(stored as AdminActionFilterValue)
    ? (stored as AdminActionFilterValue)
    : AdminActionFilter.ALL;
}

export function AdminOverviewClient({
  initialCentre,
  initialExceptions,
  metrics,
}: {
  initialCentre: AdminActionCentrePayload;
  initialExceptions: AdminExceptionItem[];
  metrics: AdminBusinessMetrics;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<AdminActionFilterValue>(AdminActionFilter.ALL);
  const [items, setItems] = useState(initialCentre.items);
  const [exceptions, setExceptions] = useState(initialExceptions);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<AdminActionItem | null>(null);
  const removedIdsRef = useRef(new Set<string>());

  const applyItems = useCallback((next: AdminActionItem[]) => {
    setItems(next.filter((i) => !removedIdsRef.current.has(i.id)));
  }, []);

  useEffect(() => {
    setFilter(readStoredFilter());
  }, []);

  useEffect(() => {
    applyItems(initialCentre.items);
    setExceptions(initialExceptions);
  }, [initialCentre, initialExceptions, applyItems]);

  const setFilterPersist = (next: AdminActionFilterValue) => {
    setFilter(next);
    sessionStorage.setItem(FILTER_KEY, next);
  };

  const refreshQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/action-centre?t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        applyItems(data.items ?? []);
        setExceptions(data.exceptions ?? []);
      }
    } finally {
      setLoading(false);
      router.refresh();
    }
  }, [router, applyItems]);

  const visible = useMemo(() => filterAdminActions(items, filter), [items, filter]);
  const counts = useMemo(() => countAdminActions(items), [items]);
  const overdueCount = items.filter((i) => i.isOverdue).length;

  const openItem = (item: AdminActionItem) => {
    setActive(item);
    setOpen(true);
  };

  const onCompleted = (itemId: string, keepInQueue: boolean) => {
    if (!keepInQueue) {
      removedIdsRef.current.add(itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    }
    void refreshQueue();
  };

  const onAlreadyProcessed = (itemId: string) => {
    removedIdsRef.current.add(itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    void refreshQueue();
  };

  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold text-mowing-green">Admin</h1>
        <p className="mt-1 text-mowing-green/80">Here’s what needs your attention.</p>
        {items.length > 0 && (
          <p className="mt-2 text-sm text-mowing-green">
            <span className="font-semibold">{items.length}</span>{" "}
            {items.length === 1 ? "action requires" : "actions require"} attention
            {overdueCount > 0 && (
              <>
                {" "}
                · <span className="font-semibold text-divot-pink">{overdueCount} overdue</span>
              </>
            )}
          </p>
        )}
      </header>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-mowing-green">Action Centre</h2>
        <p className="mt-1 mb-4 text-sm text-mowing-green/70">
          Everything Teevo needs you to do next, oldest and most urgent first.
        </p>
        <AdminActionFilters value={filter} counts={counts} onChange={setFilterPersist} />
        <AdminActionCentreList items={visible} filter={filter} loading={loading && items.length === 0} onOpen={openItem} />
      </section>

      <AdminActionReviewDrawer
        item={active}
        queue={visible}
        open={open}
        onOpenChange={setOpen}
        onAdvanceTo={(next) => {
          if (next) {
            setActive(next);
            setOpen(true);
          } else {
            setActive(null);
            setOpen(false);
          }
        }}
        onCompleted={onCompleted}
        onAlreadyProcessed={onAlreadyProcessed}
      />

      <AdminBusinessMetricsRow metrics={metrics} />
      <AdminExceptions exceptions={exceptions} />
      <AdminQuickTools />
    </div>
  );
}
