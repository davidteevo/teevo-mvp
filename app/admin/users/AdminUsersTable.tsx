"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { AdminUser } from "@/lib/admin-data";

type SortKey = "email" | "first_name" | "surname" | "role" | "stripe" | "joined";

function compareUsers(a: AdminUser, b: AdminUser, sortKey: SortKey, sortAsc: boolean): number {
  let cmp = 0;
  switch (sortKey) {
    case "email":
      cmp = (a.email ?? "").localeCompare(b.email ?? "", undefined, { sensitivity: "base" });
      break;
    case "first_name":
      cmp = (a.first_name ?? "").localeCompare(b.first_name ?? "", undefined, { sensitivity: "base" });
      break;
    case "surname":
      cmp = (a.surname ?? "").localeCompare(b.surname ?? "", undefined, { sensitivity: "base" });
      break;
    case "role":
      cmp = (a.role ?? "").localeCompare(b.role ?? "", undefined, { sensitivity: "base" });
      break;
    case "stripe":
      cmp = (a.stripe_account_id ? 1 : 0) - (b.stripe_account_id ? 1 : 0);
      break;
    case "joined":
      cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      break;
    default:
      break;
  }
  return sortAsc ? cmp : -cmp;
}

function SortHeaderButton({
  columnKey,
  label,
  activeKey,
  asc,
  onSort,
}: {
  columnKey: SortKey;
  label: string;
  activeKey: SortKey;
  asc: boolean;
  onSort: (key: SortKey) => void;
}) {
  return (
    <th className="px-4 py-3 text-sm font-semibold text-mowing-green">
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className="flex items-center gap-1 hover:underline cursor-pointer text-left"
      >
        {label}
        {activeKey === columnKey && (
          <span className="text-mowing-green/70" aria-hidden>
            {asc ? "↑" : "↓"}
          </span>
        )}
      </button>
    </th>
  );
}

export default function AdminUsersTable({ initialUsers }: { initialUsers: AdminUser[] }) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("joined");
  const [sortAsc, setSortAsc] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createFirstName, setCreateFirstName] = useState("");
  const [createLastName, setCreateLastName] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  const filteredAndSortedUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? users.filter(
          (u) =>
            (u.email ?? "").toLowerCase().includes(q) ||
            (u.first_name ?? "").toLowerCase().includes(q) ||
            (u.surname ?? "").toLowerCase().includes(q)
        )
      : users;
    return [...filtered].sort((a, b) => compareUsers(a, b, sortKey, sortAsc));
  }, [users, searchQuery, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(key === "joined" ? false : true);
    }
  };

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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = createEmail.trim().toLowerCase();
    if (!email) {
      setCreateError("Email is required");
      return;
    }
    setCreateError(null);
    setCreateLoading(true);
    try {
      const res = await fetch("/api/admin/sellers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          first_name: createFirstName.trim() || null,
          last_name: createLastName.trim() || null,
          phone: createPhone.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setCreateEmail("");
        setCreateFirstName("");
        setCreateLastName("");
        setCreatePhone("");
        setShowCreateForm(false);
        router.refresh();
      } else if (res.status === 409) {
        setCreateError(data.error ?? "User already exists with this email");
        router.refresh();
      } else {
        setCreateError(data.error ?? "Failed to create user");
      }
    } finally {
      setCreateLoading(false);
    }
  };

  const searchInput = (
    <input
      type="search"
      placeholder="Search by email or name"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="w-full max-w-sm rounded-lg border border-mowing-green/30 bg-white px-3 py-2 text-sm text-mowing-green placeholder:text-mowing-green/50"
    />
  );

  const createUserForm = (
    <div className="rounded-xl border border-par-3-punch/20 bg-white p-4 mb-4">
      <div className="flex items-center justify-between gap-4 mb-3">
        <h2 className="text-sm font-semibold text-mowing-green">Create user</h2>
        {!showCreateForm ? (
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="rounded-lg bg-mowing-green text-white px-3 py-1.5 text-sm font-medium hover:bg-mowing-green/90"
          >
            Add user
          </button>
        ) : (
          <button
            type="button"
            onClick={() => { setShowCreateForm(false); setCreateError(null); }}
            className="rounded-lg border border-mowing-green/30 px-3 py-1.5 text-sm text-mowing-green hover:bg-mowing-green/5"
          >
            Cancel
          </button>
        )}
      </div>
      {showCreateForm && (
        <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-mowing-green/70 mb-1">Email *</label>
            <input
              type="email"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-mowing-green/20 px-3 py-2 text-sm text-mowing-green"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-mowing-green/70 mb-1">First name</label>
            <input
              type="text"
              value={createFirstName}
              onChange={(e) => setCreateFirstName(e.target.value)}
              className="w-full rounded-lg border border-mowing-green/20 px-3 py-2 text-sm text-mowing-green"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-mowing-green/70 mb-1">Last name</label>
            <input
              type="text"
              value={createLastName}
              onChange={(e) => setCreateLastName(e.target.value)}
              className="w-full rounded-lg border border-mowing-green/20 px-3 py-2 text-sm text-mowing-green"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-mowing-green/70 mb-1">Phone (optional)</label>
            <input
              type="tel"
              value={createPhone}
              onChange={(e) => setCreatePhone(e.target.value)}
              className="w-full rounded-lg border border-mowing-green/20 px-3 py-2 text-sm text-mowing-green"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={createLoading}
              className="w-full rounded-lg bg-mowing-green text-white px-3 py-2 text-sm font-medium hover:bg-mowing-green/90 disabled:opacity-50"
            >
              {createLoading ? "Creating…" : "Create user"}
            </button>
          </div>
        </form>
      )}
      {showCreateForm && createError && (
        <p className="mt-2 text-sm text-amber-600">{createError}</p>
      )}
    </div>
  );

  if (users.length === 0) {
    return (
      <div className="space-y-4">
        {createUserForm}
        {searchInput}
        <div className="p-8 text-center text-mowing-green/80">No users yet. Create one above.</div>
      </div>
    );
  }

  if (filteredAndSortedUsers.length === 0) {
    return (
      <div className="space-y-4">
        {createUserForm}
        {searchInput}
        <div className="p-8 text-center text-mowing-green/80">No users match your search.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {createUserForm}
      {searchInput}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-par-3-punch/20 bg-mowing-green/5">
              <SortHeaderButton columnKey="email" label="Email" activeKey={sortKey} asc={sortAsc} onSort={handleSort} />
              <SortHeaderButton columnKey="first_name" label="First name" activeKey={sortKey} asc={sortAsc} onSort={handleSort} />
              <SortHeaderButton columnKey="surname" label="Last name" activeKey={sortKey} asc={sortAsc} onSort={handleSort} />
              <SortHeaderButton columnKey="role" label="Role" activeKey={sortKey} asc={sortAsc} onSort={handleSort} />
              <SortHeaderButton columnKey="stripe" label="Stripe connected" activeKey={sortKey} asc={sortAsc} onSort={handleSort} />
              <SortHeaderButton columnKey="joined" label="Joined" activeKey={sortKey} asc={sortAsc} onSort={handleSort} />
              <th className="px-4 py-3 text-sm font-semibold text-mowing-green">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedUsers.map((u) => (
              <tr key={u.id} className="border-b border-par-3-punch/10">
                <td className="px-4 py-3 text-sm text-mowing-green">{u.email}</td>
                <td className="px-4 py-3 text-sm text-mowing-green/90">{u.first_name?.trim() || "—"}</td>
                <td className="px-4 py-3 text-sm text-mowing-green/90">{u.surname?.trim() || "—"}</td>
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
    </div>
  );
}
