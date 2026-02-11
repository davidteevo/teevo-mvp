"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ListingForm } from "@/components/listing/ListingForm";

const CATEGORIES = ["Driver", "Irons", "Wedges", "Putter", "Apparel", "Bag"] as const;
const BRANDS = [
  "Titleist", "Callaway", "TaylorMade", "Ping", "Cobra", "Mizuno", "Srixon", "Wilson", "Other",
];
const CONDITIONS = ["New", "Excellent", "Good", "Used"] as const;

export default function SellPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center text-mowing-green/80">
        Loading…
      </div>
    );
  }

  if (!user) {
    router.replace(`/login?redirect=${encodeURIComponent("/sell")}`);
    return null;
  }

  const handleSubmit = async (payload: {
    category: string;
    brand: string;
    model: string;
    condition: string;
    description: string;
    price: string;
    images: File[];
  }) => {
    setSubmitting(true);
    try {
      const pricePence = Math.round(parseFloat(payload.price) * 100);
      if (Number.isNaN(pricePence) || pricePence <= 0) {
        throw new Error("Invalid price");
      }
      const formData = new FormData();
      formData.set("category", payload.category);
      formData.set("brand", payload.brand);
      formData.set("model", payload.model);
      formData.set("condition", payload.condition);
      formData.set("description", payload.description);
      formData.set("price", String(pricePence));
      payload.images.forEach((f, i) => formData.append("images", f, f.name));

      const res = await fetch("/api/listings", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create listing");
      router.push("/sell/success");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-mowing-green">List an item</h1>
      <p className="mt-2 text-mowing-green/80 text-sm">
        Under 2 minutes. We’ll verify your listing before it goes live.
      </p>
      <ListingForm
        categories={CATEGORIES}
        brands={BRANDS}
        conditions={CONDITIONS}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </div>
  );
}
