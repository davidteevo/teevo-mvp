"use client";

import { useEffect, useState } from "react";

type User = {
  id: string;
  email: string;
  role: string;
  stripe_account_id: string | null;
  created_at: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = () => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => setUsers(data.users ?? []))
      .catch(() => setUsers([]));
  };

  useEffect(() => {
    load();
  }, []);

  const updateRole = async (userId: string, role: string) => {
    setUpdatingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.ok) load();
      else {
        const data = await res.json();
        alert(data.error ?? "Failed to update");
      }
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-mowing-green">Manage users</h1>
      <p className="mt-1 text-mowing-green/80">View users and change roles (buyer, seller, admin).</p>
      <div className="mt-6 rounded-xl border border-par-3-punch/20 bg-white overflow-hidden">
        {users.length === 0 ? (
          <div className="p-8 text-center text-mowing-green/80">No users yet.</div>
        ) : (
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
                    <td className="px-4 py-3">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
