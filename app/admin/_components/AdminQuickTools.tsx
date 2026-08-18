"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusCircle, Search, UserSearch } from "lucide-react";

export function AdminQuickTools() {
  const router = useRouter();
  const [orderId, setOrderId] = useState("");
  const [userQuery, setUserQuery] = useState("");

  const findOrder = (e: FormEvent) => {
    e.preventDefault();
    const id = orderId.trim();
    if (!id) {
      router.push("/admin/transactions");
      return;
    }
    router.push(`/admin/transactions?id=${encodeURIComponent(id)}`);
  };

  const findUser = (e: FormEvent) => {
    e.preventDefault();
    const q = userQuery.trim();
    if (!q) {
      router.push("/admin/users");
      return;
    }
    router.push(`/admin/users?q=${encodeURIComponent(q)}`);
  };

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-mowing-green">Quick tools</h2>
      <p className="mt-1 text-sm text-mowing-green/70">Utilities that are not already in the Action Centre.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Link
          href="/admin/create-listing"
          className="rounded-xl border border-par-3-punch/20 bg-white p-4 hover:shadow-md transition-shadow flex items-start gap-3"
        >
          <div className="rounded-lg bg-golden-tee/20 p-2">
            <PlusCircle className="h-5 w-5 text-mowing-green" />
          </div>
          <div>
            <p className="font-semibold text-mowing-green">Create listing on behalf of seller</p>
            <p className="mt-0.5 text-sm text-mowing-green/70">Add a seller and publish a listing for them.</p>
          </div>
        </Link>

        <form
          onSubmit={findOrder}
          className="rounded-xl border border-par-3-punch/20 bg-white p-4 flex flex-col gap-2"
        >
          <div className="flex items-center gap-2 text-mowing-green">
            <Search className="h-4 w-4" />
            <p className="font-semibold">Find order</p>
          </div>
          <input
            type="search"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="Order ID"
            className="rounded-lg border border-par-3-punch/30 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-mowing-green px-3 py-2 text-sm font-medium text-off-white-pique hover:opacity-90"
          >
            Open
          </button>
        </form>

        <form
          onSubmit={findUser}
          className="rounded-xl border border-par-3-punch/20 bg-white p-4 flex flex-col gap-2"
        >
          <div className="flex items-center gap-2 text-mowing-green">
            <UserSearch className="h-4 w-4" />
            <p className="font-semibold">Find user</p>
          </div>
          <input
            type="search"
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder="Name or email"
            className="rounded-lg border border-par-3-punch/30 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-mowing-green px-3 py-2 text-sm font-medium text-off-white-pique hover:opacity-90"
          >
            Search
          </button>
        </form>
      </div>
    </section>
  );
}
