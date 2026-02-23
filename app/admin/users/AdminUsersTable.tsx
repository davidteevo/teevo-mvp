"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AdminUser } from "@/lib/admin-data";

export default function AdminUsersTable({ initialUsers }: { initialUsers: AdminUser[] }) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  const deleteUser = async (userId: string, email: string) => {
    if (!confirm(`Permanently delete user ${email}? They will not be able to sign in again.`)) return;
    setDeletingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        router.refresh();
      } else {
        alert(data.error ?? "Failed to delete");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const updateRole = async (userId: string, role: string) => {
    setUpdatingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.ok) router.refresh();
      else {
        const data = await res.json();
        alert(data.error ?? "Failed to update");
      }
    } finally {
      setUpdatingId(null);
    }
  };

  if (users.length === 0) {
    return <div className="p-8 text-center text-mowing-green/80">No users yet.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-par-3-punch/20 bg-mowing-green/5">
            <th className="px-4 py-3 text-sm font-semibold text-mowing-green">Email</th>
            <th className="px-4 py-3 text-sm font-semibold text-mowing-green">Role</th>
            <th className="px-4 py-3 text-sm font-semibold text-mowing-green">Stripe connected</th>
            <th className="px-4 py-3 text-sm font-semibold text-mowing-green">Joined</th>
            <th className="px-4 py-3 text-sm font-semibold text-mowing-green">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-par-3-punch/10">
              <td className="px-4 py-3 text-sm text-mowing-green">{u.email}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  u.role === "admin" ? "bg-divot-pink/30 text-mowing-green" :
                  u.role === "seller" ? "bg-par-3-punch/30 text-mowing-green" :
                  "bg-mowing-green/10 text-mowing-green"
                }`}>
                  {u.role}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-mowing-green/80">
                {u.stripe_account_id ? "Yes" : "—"}
              </td>
              <td className="px-4 py-3 text-sm text-mowing-green/70">
                {new Date(u.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 flex flex-wrap items-center gap-2">
                <select
                  value={u.role}
                  onChange={(e) => updateRole(u.id, e.target.value)}
                  disabled={updatingId === u.id}
                  className="rounded-lg border border-mowing-green/30 bg-white px-2 py-1.5 text-sm text-mowing-green disabled:opacity-60"
                >
                  <option value="buyer">Buyer</option>
                  <option value="seller">Seller</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  type="button"
                  onClick={() => deleteUser(u.id, u.email)}
                  disabled={deletingId === u.id}
                  className="rounded-lg border border-divot-pink text-divot-pink px-2 py-1.5 text-sm font-medium hover:bg-divot-pink/10 disabled:opacity-50"
                >
                  {deletingId === u.id ? "Deleting…" : "Delete"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
