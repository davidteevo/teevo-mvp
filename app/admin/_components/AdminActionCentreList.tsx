"use client";

import { emptyFilterMessage, type AdminActionFilterValue, type AdminActionItem } from "@/lib/admin-action-centre";
import { AdminActionRow } from "./AdminActionRow";

export function AdminActionCentreList({
  items,
  filter,
  loading,
  onOpen,
}: {
  items: AdminActionItem[];
  filter: AdminActionFilterValue;
  loading: boolean;
  onOpen: (item: AdminActionItem) => void;
}) {
  if (loading) {
    return (
      <div className="mt-4 rounded-xl border border-par-3-punch/20 bg-white p-8 text-center text-mowing-green/70">
        Loading actions…
      </div>
    );
  }

  if (items.length === 0) {
    const caughtUp = filter === "all";
    return (
      <div className="mt-4 rounded-xl border border-par-3-punch/20 bg-white p-8 text-center">
        <p className="text-lg font-semibold text-mowing-green">
          {caughtUp ? "You're all caught up" : "Nothing in this queue"}
        </p>
        <p className="mt-1 text-sm text-mowing-green/70">{emptyFilterMessage(filter)}</p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-4 hidden md:block overflow-x-auto rounded-xl border border-par-3-punch/20 bg-white">
        <table className="min-w-full text-left">
          <thead className="bg-off-white-pique text-xs uppercase tracking-wide text-mowing-green/70">
            <tr>
              <th className="px-3 py-2 font-medium">Priority</th>
              <th className="px-3 py-2 font-medium">Action required</th>
              <th className="px-3 py-2 font-medium">Listing / Order</th>
              <th className="px-3 py-2 font-medium">User</th>
              <th className="px-3 py-2 font-medium">Waiting</th>
              <th className="px-3 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <AdminActionRow key={item.id} item={item} onOpen={onOpen} variant="row" />
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 grid gap-3 md:hidden">
        {items.map((item) => (
          <AdminActionRow key={item.id} item={item} onOpen={onOpen} variant="card" />
        ))}
      </div>
    </>
  );
}
