"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { displayNameFromProfile, type AdminUserDetail } from "@/lib/admin-users";

const TABS = ["Overview", "Listings", "Sales", "Purchases", "Rewards", "Activity", "Admin"] as const;
type Tab = (typeof TABS)[number];

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminUserDetailClient({ initialUser }: { initialUser: AdminUserDetail }) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [tab, setTab] = useState<Tab>("Overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [firstName, setFirstName] = useState(user.first_name ?? "");
  const [surname, setSurname] = useState(user.surname ?? "");
  const [displayName, setDisplayName] = useState(user.display_name ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [listings, setListings] = useState<Record<string, unknown>[] | null>(null);
  const [sales, setSales] = useState<Record<string, unknown>[] | null>(null);
  const [purchases, setPurchases] = useState<Record<string, unknown>[] | null>(null);
  const [rewards, setRewards] = useState<Record<string, unknown> | null>(null);
  const [activity, setActivity] = useState<Record<string, unknown>[] | null>(null);
  const [notes, setNotes] = useState<Record<string, unknown>[] | null>(null);
  const [audit, setAudit] = useState<Record<string, unknown>[] | null>(null);
  const [noteBody, setNoteBody] = useState("");
  const loadedTabs = useRef<Set<string>>(new Set());
  const name = displayNameFromProfile(user);

  const refreshUser = useCallback(async () => {
    const res = await fetch(`/api/admin/users/${user.id}`);
    const data = await res.json();
    if (res.ok && data.user) setUser(data.user);
  }, [user.id]);

  const loadTab = useCallback(
    async (next: Tab) => {
      if (loadedTabs.current.has(next)) return;
      try {
        if (next === "Listings") {
          const res = await fetch(`/api/admin/users/${user.id}/listings`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          setListings(data.rows ?? []);
        } else if (next === "Sales") {
          const res = await fetch(`/api/admin/users/${user.id}/sales`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          setSales(data.rows ?? []);
        } else if (next === "Purchases") {
          const res = await fetch(`/api/admin/users/${user.id}/purchases`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          setPurchases(data.rows ?? []);
        } else if (next === "Rewards") {
          const res = await fetch(`/api/admin/users/${user.id}/rewards`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          setRewards(data);
        } else if (next === "Activity") {
          const res = await fetch(`/api/admin/users/${user.id}/activity`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          setActivity(data.rows ?? []);
        } else if (next === "Admin") {
          const res = await fetch(`/api/admin/users/${user.id}/notes`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          setNotes(data.notes ?? []);
          setAudit(data.audit ?? []);
        }
        loadedTabs.current.add(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    },
    [user.id]
  );

  useEffect(() => {
    void loadTab(tab);
  }, [tab, loadTab]);

  async function postJson(url: string, body?: unknown) {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Request failed");
        return null;
      }
      return data;
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          surname,
          display_name: displayName,
          phone,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not save");
        return;
      }
      setEditOpen(false);
      setFlash("Profile updated");
      await refreshUser();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="text-sm text-par-3-punch hover:underline">
        ← Users
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4 min-w-0">
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar_url}
              alt=""
              className="h-16 w-16 rounded-full object-cover border border-par-3-punch/20"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-mowing-green/10 flex items-center justify-center text-lg font-semibold text-mowing-green">
              {name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-mowing-green truncate">{name}</h1>
            <p className="text-sm text-mowing-green/80 truncate">{user.email}</p>
            <p className="mt-1 font-mono text-xs text-mowing-green/60 break-all">{user.id}</p>
            <p className="mt-1 text-sm text-mowing-green/70">Member since {formatDate(user.created_at)}</p>
            <span
              className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${
                user.account_status === "suspended"
                  ? "bg-divot-pink/40 text-mowing-green"
                  : "bg-mowing-green/10 text-mowing-green"
              }`}
            >
              {user.account_status === "suspended" ? "Suspended" : "Active"}
            </span>
          </div>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded-lg border border-par-3-punch/30 bg-white px-3 py-2 text-sm font-medium text-mowing-green"
          >
            Actions
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-par-3-punch/20 bg-white py-1 shadow-lg">
              <ActionItem
                label="Edit user"
                onClick={() => {
                  setEditOpen(true);
                  setMenuOpen(false);
                }}
              />
              <ActionItem
                label="Change email"
                onClick={() => {
                  setEmailOpen(true);
                  setMenuOpen(false);
                }}
              />
              <ActionItem
                label="Send password reset"
                onClick={async () => {
                  setMenuOpen(false);
                  if (!confirm(`Send a password reset email to ${user.email}?`)) return;
                  const ok = await postJson(`/api/admin/users/${user.id}/password-reset`);
                  if (ok) setFlash("Password reset email sent.");
                }}
              />
              {user.account_status === "suspended" ? (
                <ActionItem
                  label="Reinstate account"
                  onClick={async () => {
                    setMenuOpen(false);
                    if (!confirm("Reinstate this account?")) return;
                    const ok = await postJson(`/api/admin/users/${user.id}/reinstate`);
                    if (ok) {
                      setFlash("Account reinstated");
                      loadedTabs.current.clear();
                      await refreshUser();
                    }
                  }}
                />
              ) : (
                <ActionItem
                  label="Suspend account"
                  onClick={async () => {
                    setMenuOpen(false);
                    const reason = window.prompt("Reason for suspension?");
                    if (!reason?.trim()) return;
                    if (!confirm(`Suspend this account?\n\n${reason}`)) return;
                    const ok = await postJson(`/api/admin/users/${user.id}/suspend`, {
                      reason: reason.trim(),
                    });
                    if (ok) {
                      setFlash("Account suspended");
                      loadedTabs.current.clear();
                      await refreshUser();
                    }
                  }}
                />
              )}
              <ActionItem
                label="View public profile"
                onClick={() => {
                  window.open(`/seller/${user.id}`, "_blank");
                  setMenuOpen(false);
                }}
              />
              <ActionItem
                label="Copy user ID"
                onClick={async () => {
                  await navigator.clipboard.writeText(user.id);
                  setMenuOpen(false);
                  setFlash("User ID copied");
                }}
              />
            </div>
          )}
        </div>
      </div>

      {flash && <p className="text-sm text-mowing-green">{flash}</p>}
      {error && <p className="text-sm text-amber-800">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          ["Listings", String(user.listing_count)],
          ["Sales", String(user.sale_count)],
          ["Purchases", String(user.purchase_count)],
          ["Teevo Credit", formatPrice(user.credit_pence)],
          ["Account Status", user.account_status === "suspended" ? "Suspended" : "Active"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-par-3-punch/20 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-mowing-green/60">{label}</p>
            <p className="mt-1 text-lg font-semibold text-mowing-green">{value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-2" role="tablist">
          {TABS.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              onClick={() => setTab(item)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                tab === item
                  ? "bg-mowing-green text-off-white-pique"
                  : "border border-par-3-punch/30 text-mowing-green"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {tab === "Overview" && (
        <div className="rounded-xl border border-par-3-punch/20 bg-white p-5 space-y-4">
          <h2 className="font-semibold text-mowing-green">Account information</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Field label="Name" value={name} />
            <Field label="Email" value={user.email} />
            <Field label="Phone" value={user.phone || "—"} />
            <Field label="Display name" value={user.display_name || "—"} />
            <Field label="Joined" value={formatDate(user.created_at)} />
            <Field label="Last updated" value={formatDate(user.updated_at)} />
            <Field label="Role" value={user.role} />
            <Field label="Stripe connected" value={user.stripe_account_id ? "Yes" : "No"} />
          </dl>
          <div className="border-t border-par-3-punch/15 pt-4">
            <h3 className="font-semibold text-mowing-green">Authentication</h3>
            <p className="mt-2 text-sm text-mowing-green/80">
              Email verified: {user.email_confirmed ? "Yes" : "No"}
            </p>
            <p className="mt-1 text-sm text-mowing-green/80">Password — Managed securely by Supabase</p>
          </div>
          {user.rating_count > 0 && (
            <p className="text-sm text-mowing-green">
              Rating {user.rating_average?.toFixed(1) ?? "—"} ★ · {user.rating_count} reviews ·{" "}
              <Link href="/admin/feedback" className="text-par-3-punch hover:underline">
                Open feedback
              </Link>
            </p>
          )}
        </div>
      )}

      {tab === "Listings" && (
        <div className="overflow-x-auto rounded-xl border border-par-3-punch/20 bg-white">
          {!listings ? (
            <p className="p-6 text-sm text-mowing-green/70">Loading listings…</p>
          ) : listings.length === 0 ? (
            <p className="p-6 text-sm text-mowing-green/70">This user hasn&apos;t created any listings yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-mowing-green/5">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => (
                  <tr key={String(listing.id)} className="border-t border-par-3-punch/10">
                    <td className="px-3 py-2">
                      <Link href={`/admin/listings/${listing.id}`} className="text-par-3-punch hover:underline">
                        {String(listing.brand)} {String(listing.model ?? "")}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{String(listing.category)}</td>
                    <td className="px-3 py-2">{formatPrice(Number(listing.price))}</td>
                    <td className="px-3 py-2">{String(listing.status_label)}</td>
                    <td className="px-3 py-2">{formatDate(String(listing.created_at))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "Sales" && (
        <TxTable
          loading={sales == null}
          empty="No completed sales yet."
          rows={sales ?? []}
          counterpartyKey="buyer_email"
          counterpartyLabel="Buyer"
        />
      )}
      {tab === "Purchases" && (
        <TxTable
          loading={purchases == null}
          empty="No purchases yet."
          rows={purchases ?? []}
          counterpartyKey="seller_email"
          counterpartyLabel="Seller"
        />
      )}

      {tab === "Rewards" && (
        <div className="space-y-4 rounded-xl border border-par-3-punch/20 bg-white p-5 text-sm">
          {!rewards ? (
            <p className="text-mowing-green/70">Loading rewards…</p>
          ) : (
            <>
              <h2 className="font-semibold text-mowing-green">Teevo credit</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <p>Available {formatPrice(Number(rewards.available_pence ?? 0))}</p>
                <p>Earned {formatPrice(Number(rewards.earned_pence ?? 0))}</p>
                <p>Spent {formatPrice(Number(rewards.spent_pence ?? 0))}</p>
                <p>Expired {formatPrice(Number(rewards.expired_pence ?? 0))}</p>
              </div>
              {user.founding_seller_rank != null && (
                <p>
                  Founding member #{user.founding_seller_rank}
                  {user.founder_joined_at ? ` · enrolled ${formatDate(user.founder_joined_at)}` : ""}
                  {user.founder_reward_status ? ` · ${user.founder_reward_status}` : ""}
                </p>
              )}
              <h2 className="pt-2 font-semibold text-mowing-green">Referral activity</h2>
              <p>
                Codes:{" "}
                {((rewards.referral_codes as { code: string }[]) ?? []).map((c) => c.code).join(", ") || "None"}
              </p>
              <p>
                Referred {Number(rewards.referred_count ?? 0)} · Successful{" "}
                {Number(rewards.successful_referrals ?? 0)} · Pending {Number(rewards.pending_referrals ?? 0)}
              </p>
              {((rewards.referrals as Record<string, unknown>[]) ?? []).length === 0 ? (
                <p className="text-mowing-green/70">No referral activity yet.</p>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr>
                      <th className="py-1">User</th>
                      <th>Trigger</th>
                      <th>Reward</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((rewards.referrals as Record<string, unknown>[]) ?? []).map((row, i) => (
                      <tr key={i} className="border-t border-par-3-punch/10">
                        <td className="py-1">
                          <Link href={`/admin/users/${row.user_id}`} className="text-par-3-punch hover:underline">
                            {String(row.user_name)}
                          </Link>
                        </td>
                        <td>{String(row.trigger)}</td>
                        <td>{row.reward_pence != null ? formatPrice(Number(row.reward_pence)) : "—"}</td>
                        <td>{String(row.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      )}

      {tab === "Activity" && (
        <div className="rounded-xl border border-par-3-punch/20 bg-white p-5">
          {!activity ? (
            <p className="text-sm text-mowing-green/70">Loading activity…</p>
          ) : activity.length === 0 ? (
            <p className="text-sm text-mowing-green/70">No activity recorded yet.</p>
          ) : (
            <ol className="space-y-3">
              {activity.map((item) => (
                <li key={String(item.id)} className="text-sm">
                  <p className="text-xs text-mowing-green/60">{formatDate(String(item.at))}</p>
                  <p className="font-medium text-mowing-green">{String(item.title)}</p>
                  {item.detail ? <p className="text-mowing-green/80">{String(item.detail)}</p> : null}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {tab === "Admin" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-par-3-punch/20 bg-white p-5">
            <h2 className="font-semibold text-mowing-green">Admin notes</h2>
            <textarea
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              rows={3}
              className="mt-3 w-full rounded-lg border border-mowing-green/20 px-3 py-2 text-sm"
              placeholder="Add an internal note"
            />
            <button
              type="button"
              disabled={busy || !noteBody.trim()}
              className="mt-2 rounded-lg bg-mowing-green px-3 py-1.5 text-sm text-white disabled:opacity-50"
              onClick={async () => {
                const data = await postJson(`/api/admin/users/${user.id}/notes`, { body: noteBody });
                if (data) {
                  setNoteBody("");
                  setNotes(data.notes ?? []);
                  setFlash("Note added");
                }
              }}
            >
              Add note
            </button>
            <ul className="mt-4 space-y-3">
              {(notes ?? []).map((note) => (
                <li key={String(note.id)} className="border-t border-par-3-punch/10 pt-3 text-sm">
                  <p className="text-xs text-mowing-green/60">
                    {formatDate(String(note.created_at))} · {String(note.admin_name)}
                  </p>
                  <p className="whitespace-pre-wrap text-mowing-green">{String(note.body)}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-par-3-punch/20 bg-white p-5">
            <h2 className="font-semibold text-mowing-green">Audit log</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {(audit ?? []).map((entry) => (
                <li key={String(entry.id)}>
                  <span className="font-medium">{String(entry.action)}</span>
                  <span className="text-mowing-green/60"> · {formatDate(String(entry.created_at))}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {editOpen && (
        <Dialog title="Edit user" onClose={() => setEditOpen(false)}>
          <label className="mb-1 block text-xs">First name</label>
          <input className="mb-2 w-full rounded border px-2 py-1.5 text-sm" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <label className="mb-1 block text-xs">Last name</label>
          <input className="mb-2 w-full rounded border px-2 py-1.5 text-sm" value={surname} onChange={(e) => setSurname(e.target.value)} />
          <label className="mb-1 block text-xs">Display name</label>
          <input className="mb-2 w-full rounded border px-2 py-1.5 text-sm" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <label className="mb-1 block text-xs">Phone</label>
          <input className="mb-4 w-full rounded border px-2 py-1.5 text-sm" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button type="button" className="text-sm" onClick={() => setEditOpen(false)}>
              Cancel
            </button>
            <button type="button" disabled={busy} className="rounded-lg bg-mowing-green px-3 py-1.5 text-sm text-white" onClick={() => void saveProfile()}>
              Save
            </button>
          </div>
        </Dialog>
      )}

      {emailOpen && (
        <Dialog title="Change email" onClose={() => setEmailOpen(false)}>
          <p className="mb-2 text-sm">Current: {user.email}</p>
          <label className="mb-1 block text-xs">New email</label>
          <input className="mb-2 w-full rounded border px-2 py-1.5 text-sm" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
          <label className="mb-1 block text-xs">Confirm new email</label>
          <input className="mb-4 w-full rounded border px-2 py-1.5 text-sm" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button type="button" className="text-sm" onClick={() => setEmailOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              className="rounded-lg bg-mowing-green px-3 py-1.5 text-sm text-white"
              onClick={async () => {
                if (!confirm(`Change this user's login email from ${user.email} to ${newEmail}?`)) return;
                const ok = await postJson(`/api/admin/users/${user.id}/email`, {
                  email: newEmail,
                  confirm_email: confirmEmail,
                });
                if (ok) {
                  setEmailOpen(false);
                  setNewEmail("");
                  setConfirmEmail("");
                  setFlash("Email updated");
                  await refreshUser();
                }
              }}
            >
              Update email
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-mowing-green/60">{label}</dt>
      <dd className="text-mowing-green">{value}</dd>
    </div>
  );
}

function ActionItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="block w-full px-3 py-2 text-left text-sm text-mowing-green hover:bg-mowing-green/5"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function TxTable({
  loading,
  empty,
  rows,
  counterpartyKey,
  counterpartyLabel,
}: {
  loading: boolean;
  empty: string;
  rows: Record<string, unknown>[];
  counterpartyKey: string;
  counterpartyLabel: string;
}) {
  if (loading) {
    return (
      <p className="rounded-xl border border-par-3-punch/20 bg-white p-6 text-sm text-mowing-green/70">Loading…</p>
    );
  }
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-par-3-punch/20 bg-white p-6 text-sm text-mowing-green/70">{empty}</p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-par-3-punch/20 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-mowing-green/5">
          <tr>
            <th className="px-3 py-2">Item</th>
            <th className="px-3 py-2">{counterpartyLabel}</th>
            <th className="px-3 py-2">Amount</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Order</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row.id)} className="border-t border-par-3-punch/10">
              <td className="px-3 py-2">{String(row.listing_title)}</td>
              <td className="px-3 py-2">{String(row[counterpartyKey] ?? "—")}</td>
              <td className="px-3 py-2">{formatPrice(Number(row.amount))}</td>
              <td className="px-3 py-2">{String(row.order_state || row.status)}</td>
              <td className="px-3 py-2">{formatDate(String(row.created_at))}</td>
              <td className="px-3 py-2">
                <Link href={`/admin/transactions/${row.id}`} className="text-par-3-punch hover:underline">
                  {String(row.id).slice(0, 8)}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 text-mowing-green">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="text-sm">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
