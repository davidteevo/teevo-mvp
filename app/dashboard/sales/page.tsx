"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { formatPrice } from "@/lib/format";
import {
  FulfilmentStatus,
  ShippingPackage,
  BOX_TYPES,
  BOX_FEE_GBP,
  PackagingStatus,
  PACKAGING_PHOTO_LABELS,
  PACKAGING_PHOTO_COUNT,
} from "@/lib/fulfilment";

const PACKAGING_BUCKET = "packaging-photos";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

type PackagingUploadPhase = "upload_urls" | "uploading" | "submitting";
type PackagingUploadStatus = { id: string; phase: PackagingUploadPhase; current?: number; total?: number } | null;

function getPackagingStatusLabel(status: NonNullable<PackagingUploadStatus>): string {
  switch (status.phase) {
    case "upload_urls":
      return "Preparing upload…";
    case "uploading":
      return status.total != null && status.current != null
        ? `Uploading photo ${status.current} of ${status.total}…`
        : "Uploading photos…";
    case "submitting":
      return "Submitting for review…";
    default:
      return "Uploading…";
  }
}

type ListingImage = { storage_path: string; sort_order: number };

type Transaction = {
  id: string;
  listing_id: string;
  status: string;
  amount: number;
  created_at: string;
  fulfilment_status?: string | null;
  shipping_package?: string | null;
  box_fee_gbp?: number | null;
  box_type?: string | null;
  shippo_label_url?: string | null;
  shippo_qr_code_url?: string | null;
  shippo_tracking_number?: string | null;
  packaging_photos?: string[] | null;
  packaging_status?: string | null;
  packaging_review_notes?: string | null;
  review_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  listing?: {
    model: string;
    category: string;
    brand: string;
    listing_images?: ListingImage[] | null;
  } | null;
};

const BOX_LABELS: Record<string, string> = {
  DRIVER_BOX: "Driver box (£4.99)",
  IRON_SET_BOX: "Iron set box (£4.99)",
  PUTTER_BOX: "Putter box (£4.99)",
  SMALL_BOX: "Small box (£4.99)",
};

function firstImagePath(images: ListingImage[] | null | undefined): string | null {
  if (!images?.length) return null;
  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);
  return sorted[0]?.storage_path ?? null;
}

export default function DashboardSalesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [creatingLabelId, setCreatingLabelId] = useState<string | null>(null);
  const [packagingSubmittingId, setPackagingSubmittingId] = useState<string | null>(null);
  const [packagingPhotoSubmittingId, setPackagingPhotoSubmittingId] = useState<string | null>(null);
  const [packagingUploadStatus, setPackagingUploadStatus] = useState<PackagingUploadStatus>(null);
  const [packagingPhotoFiles, setPackagingPhotoFiles] = useState<Record<string, (File | null)[]>>({});
  const [teevoBoxType, setTeevoBoxType] = useState<string>(BOX_TYPES[0]);

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?redirect=${encodeURIComponent("/dashboard/sales")}`);
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const fetchTransactions = () => {
      fetch("/api/transactions?role=seller")
        .then((r) => r.json())
        .then((data) => setTransactions(data.transactions ?? []))
        .catch(() => setTransactions([]));
    };
    fetchTransactions();
    window.addEventListener("focus", fetchTransactions);
    return () => window.removeEventListener("focus", fetchTransactions);
  }, [user]);

  const formatDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const markShipped = async (id: string) => {
    const res = await fetch(`/api/transactions/${id}/shipped`, { method: "POST" });
    if (res.ok) {
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "shipped" } : t))
      );
    } else {
      const data = await res.json();
      alert(data.error ?? "Failed");
    }
  };

  const submitPackaging = async (id: string, shippingPackage: string, boxType?: string) => {
    setPackagingSubmittingId(id);
    try {
      const res = await fetch(`/api/transactions/${id}/packaging`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          shippingPackage === ShippingPackage.TEEVO_BOX
            ? { shipping_package: shippingPackage, box_type: boxType ?? teevoBoxType }
            : { shipping_package: shippingPackage }
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setTransactions((prev) =>
          prev.map((t) =>
            t.id === id
              ? {
                  ...t,
                  fulfilment_status: FulfilmentStatus.PACKAGING_SUBMITTED,
                  shipping_package: shippingPackage,
                  box_type: shippingPackage === ShippingPackage.TEEVO_BOX ? (boxType ?? teevoBoxType) : null,
                  box_fee_gbp: shippingPackage === ShippingPackage.TEEVO_BOX ? BOX_FEE_GBP[(boxType ?? teevoBoxType) as keyof typeof BOX_FEE_GBP] : null,
                }
              : t
          )
        );
      } else {
        alert(data.error ?? "Failed");
      }
    } finally {
      setPackagingSubmittingId(null);
    }
  };

  const submitPackagingPhotos = async (id: string) => {
    const files = packagingPhotoFiles[id] ?? [];
    const valid = files.filter((f): f is File => f != null && f.size > 0);
    if (valid.length < 3) {
      alert("Please upload at least 3 photos (club condition, wrapped, inside box, sealed box).");
      return;
    }
    setPackagingPhotoSubmittingId(id);
    setPackagingUploadStatus({ id, phase: "upload_urls" });
    try {
      const urlsRes = await fetch(`/api/transactions/${id}/packaging-photos/upload-urls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: PACKAGING_PHOTO_COUNT }),
      });
      const urlsData = await urlsRes.json().catch(() => ({}));
      if (!urlsRes.ok) {
        throw new Error(urlsData.error ?? "Failed to get upload URLs");
      }
      const uploads = urlsData.uploads as { path: string; token: string }[] | undefined;
      if (!Array.isArray(uploads) || uploads.length < valid.length) {
        throw new Error("Invalid upload URLs");
      }
      if (!SUPABASE_URL) throw new Error("Missing Supabase URL");
      const paths: string[] = [];
      const allowedExt = ["jpg", "jpeg", "png", "gif", "webp"];
      for (let i = 0; i < valid.length; i++) {
        setPackagingUploadStatus({ id, phase: "uploading", current: i + 1, total: valid.length });
        const file = valid[i];
        if (!file?.size) continue;
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        if (!allowedExt.includes(ext)) continue;
        const { path, token } = uploads[i];
        const uploadUrl = `${SUPABASE_URL}/storage/v1/object/upload/sign/${PACKAGING_BUCKET}/${path}?token=${encodeURIComponent(token)}`;
        const formData = new FormData();
        formData.append("cacheControl", "3600");
        formData.append("", file);
        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          body: formData,
          headers: { "x-upsert": "true" },
        });
        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          throw new Error(
            errText ? errText.slice(0, 100) : `Photo ${i + 1} upload failed (${uploadRes.status}). Try again.`
          );
        }
        paths.push(path);
      }
      if (paths.length < 3) {
        throw new Error("At least 3 valid photos (JPG, PNG, GIF, WebP) are required.");
      }
      setPackagingUploadStatus({ id, phase: "submitting" });
      const submitRes = await fetch(`/api/transactions/${id}/packaging-photos/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths }),
      });
      const submitData = await submitRes.json().catch(() => ({}));
      if (submitRes.ok) {
        setTransactions((prev) =>
          prev.map((t) =>
            t.id === id
              ? {
                  ...t,
                  packaging_photos: paths,
                  packaging_status: PackagingStatus.SUBMITTED,
                  fulfilment_status: FulfilmentStatus.PACKAGING_SUBMITTED,
                  packaging_review_notes: null,
                  review_notes: null,
                  reviewed_by: null,
                  reviewed_at: null,
                }
              : t
          )
        );
        setPackagingPhotoFiles((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      } else {
        alert(submitData.error ?? "Failed to submit for review");
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setPackagingPhotoSubmittingId(null);
      setPackagingUploadStatus(null);
    }
  };

  const createLabel = async (id: string) => {
    setCreatingLabelId(id);
    try {
      const res = await fetch(`/api/transactions/${id}/shipping-label`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setTransactions((prev) =>
          prev.map((t) =>
            t.id === id
              ? {
                  ...t,
                  shippo_label_url: data.labelUrl ?? t.shippo_label_url,
                  shippo_qr_code_url: data.qrCodeUrl ?? t.shippo_qr_code_url ?? null,
                  shippo_tracking_number: data.trackingNumber ?? t.shippo_tracking_number,
                }
              : t
          )
        );
        if (data.labelUrl && !data.qrCodeUrl) window.open(data.labelUrl, "_blank");
      } else {
        alert(data.error ?? "Failed to create label");
      }
    } finally {
      setCreatingLabelId(null);
    }
  };

  if (loading || !user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-mowing-green/80">
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-mowing-green">Sales</h1>
      <p className="mt-1 text-mowing-green/80">Mark items as shipped when you send them.</p>
      <div className="mt-6 rounded-xl border border-par-3-punch/20 bg-white overflow-hidden">
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-mowing-green/80">
            No sales yet.
          </div>
        ) : (
          <ul className="divide-y divide-par-3-punch/10">
            {transactions.map((t) => {
              const listing = t.listing;
              const imgPath = firstImagePath(listing?.listing_images);
              const imageUrl = imgPath && process.env.NEXT_PUBLIC_SUPABASE_URL
                ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listings/${imgPath}`
                : "/placeholder-listing.svg";
              const subtitle = [listing?.category, listing?.brand].filter(Boolean).join(" · ") || null;
              return (
                <li key={t.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4">
                  <Link
                    href={`/listing/${t.listing_id}`}
                    className="flex flex-1 min-w-0 gap-4 rounded-lg hover:bg-mowing-green/5 -m-2 p-2 transition-colors"
                  >
                    <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-mowing-green/10">
                      <Image
                        src={imageUrl}
                        alt={listing?.model ?? "Listing"}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-mowing-green truncate">
                        {listing?.model ?? "Item"}
                      </p>
                      {subtitle && (
                        <p className="text-sm text-mowing-green/70 truncate">{subtitle}</p>
                      )}
                      <p className="text-sm text-mowing-green/60 mt-0.5">
                        {formatPrice(t.amount)} · {t.status}
                      </p>
                      {t.created_at && (
                        <p className="text-xs text-mowing-green/50 mt-0.5">
                          Sold {formatDateTime(t.created_at)}
                        </p>
                      )}
                      {t.shipping_package === ShippingPackage.TEEVO_BOX && t.box_fee_gbp != null && (
                        <p className="text-xs text-mowing-green/60 mt-0.5">
                          Box fee £{Number(t.box_fee_gbp).toFixed(2)} deducted from your payout
                        </p>
                      )}
                    </div>
                  </Link>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {(t.fulfilment_status === FulfilmentStatus.PAID || t.fulfilment_status == null) &&
                      !t.shipping_package &&
                      t.status === "pending" &&
                      !t.shippo_label_url && (
                        <div className="w-full sm:w-auto rounded-lg border border-golden-tee/30 bg-golden-tee/10 p-3 space-y-2">
                          <p className="text-sm font-medium text-mowing-green">Prepare your item for dispatch</p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => submitPackaging(t.id, ShippingPackage.SELLER_PACKS)}
                              disabled={packagingSubmittingId === t.id}
                              className="rounded-lg bg-mowing-green text-off-white-pique px-3 py-1.5 text-sm font-medium hover:opacity-90 disabled:opacity-70"
                            >
                              I have suitable packaging (free)
                            </button>
                            <div className="flex gap-2 items-center">
                              <select
                                value={teevoBoxType}
                                onChange={(e) => setTeevoBoxType(e.target.value)}
                                className="rounded border border-mowing-green/30 bg-white px-2 py-1.5 text-sm text-mowing-green"
                              >
                                {BOX_TYPES.map((b) => (
                                  <option key={b} value={b}>{BOX_LABELS[b] ?? b}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => submitPackaging(t.id, ShippingPackage.TEEVO_BOX)}
                                disabled={packagingSubmittingId === t.id}
                                className="rounded-lg border border-par-3-punch/50 text-par-3-punch px-3 py-1.5 text-sm font-medium hover:bg-par-3-punch/10 disabled:opacity-70"
                              >
                                Send me a Teevo box
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-mowing-green/60">Box cost is deducted from your payout. Buyer is not charged.</p>
                        </div>
                      )}
                    {t.shipping_package &&
                      (t.packaging_status === PackagingStatus.REJECTED || t.packaging_status == null) &&
                      t.status === "pending" &&
                      !t.shippo_label_url && (
                        <div className="w-full sm:w-auto rounded-lg border border-mowing-green/30 bg-mowing-green/5 p-3 space-y-2">
                          <p className="text-sm font-medium text-mowing-green">Upload packaging photos</p>
                          {t.packaging_status === PackagingStatus.REJECTED && (t.review_notes ?? t.packaging_review_notes) && (
                            <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                              Review notes: {t.review_notes ?? t.packaging_review_notes}
                            </p>
                          )}
                          {packagingPhotoSubmittingId === t.id && packagingUploadStatus?.id === t.id && (
                            <div
                              className="rounded-lg border border-mowing-green/30 bg-mowing-green/5 p-3"
                              role="status"
                              aria-live="polite"
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-mowing-green/30 border-t-mowing-green"
                                  aria-hidden
                                />
                                <span className="text-sm font-medium text-mowing-green">
                                  {getPackagingStatusLabel(packagingUploadStatus)}
                                </span>
                              </div>
                              {packagingUploadStatus.phase === "uploading" &&
                                packagingUploadStatus.total != null &&
                                packagingUploadStatus.current != null &&
                                packagingUploadStatus.total > 0 && (
                                  <div className="mt-2">
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-mowing-green/20">
                                      <div
                                        className="h-full rounded-full bg-mowing-green transition-all duration-300"
                                        style={{
                                          width: `${(100 * packagingUploadStatus.current) / packagingUploadStatus.total}%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            {PACKAGING_PHOTO_LABELS.map((label, i) => (
                              <label key={i} className="flex flex-col gap-0.5">
                                <span className="text-xs text-mowing-green/70">{label}</span>
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp,image/gif"
                                  className="text-sm text-mowing-green file:mr-2 file:rounded file:border-0 file:bg-mowing-green/10 file:px-2 file:py-1 file:text-mowing-green"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] ?? null;
                                    setPackagingPhotoFiles((prev) => {
                                      const list = prev[t.id] ?? Array(PACKAGING_PHOTO_COUNT).fill(null);
                                      const next = [...list];
                                      next[i] = file;
                                      return { ...prev, [t.id]: next };
                                    });
                                  }}
                                />
                              </label>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => submitPackagingPhotos(t.id)}
                            disabled={packagingPhotoSubmittingId === t.id}
                            className="rounded-lg bg-mowing-green text-off-white-pique px-3 py-1.5 text-sm font-medium hover:opacity-90 disabled:opacity-70"
                          >
                            {packagingPhotoSubmittingId === t.id && packagingUploadStatus?.id === t.id
                              ? getPackagingStatusLabel(packagingUploadStatus)
                              : "Submit for review"}
                          </button>
                        </div>
                      )}
                    {t.packaging_status === PackagingStatus.SUBMITTED && t.status === "pending" && (
                      <span className="inline-flex items-center rounded-lg border border-golden-tee/30 bg-golden-tee/10 px-4 py-2 text-sm text-mowing-green/80">
                        Packaging under review
                      </span>
                    )}
                    {(t.packaging_status === PackagingStatus.VERIFIED ||
                      t.fulfilment_status === FulfilmentStatus.PACKAGING_VERIFIED) &&
                      t.status === "pending" &&
                      !t.shippo_label_url && (
                        <button
                          type="button"
                          onClick={() => createLabel(t.id)}
                          disabled={creatingLabelId === t.id}
                          className="rounded-lg bg-par-3-punch text-white px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-70"
                        >
                          {creatingLabelId === t.id ? "Creating…" : "Generate QR/Label"}
                        </button>
                      )}
                    {t.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => markShipped(t.id)}
                        className="rounded-lg bg-mowing-green text-off-white-pique px-4 py-2 text-sm font-medium hover:opacity-90"
                      >
                        Mark as shipped
                      </button>
                    )}
                    {t.shippo_qr_code_url && (
                      <>
                        <a
                          href={t.shippo_qr_code_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-par-3-punch/30 text-par-3-punch px-4 py-2 text-sm font-medium hover:bg-par-3-punch/10 transition-colors inline-flex items-center gap-2"
                        >
                          View QR code
                        </a>
                        <div className="rounded-lg border border-par-3-punch/20 bg-white p-2 inline-flex flex-col items-center">
                          <p className="text-xs text-mowing-green/70 mb-1">Label QR code</p>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={t.shippo_qr_code_url}
                            alt="Shipping label QR code"
                            className="w-24 h-24 object-contain"
                          />
                        </div>
                      </>
                    )}
                    {t.shippo_label_url && (
                      <a
                        href={t.shippo_label_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-par-3-punch/30 text-par-3-punch px-4 py-2 text-sm font-medium hover:bg-par-3-punch/10 transition-colors"
                      >
                        {t.shippo_qr_code_url ? "Download label PDF" : "Download label"}
                      </a>
                    )}
                    {t.shippo_tracking_number && (
                      <span className="text-sm text-mowing-green/70" title="Tracking number">
                        Track: {t.shippo_tracking_number}
                      </span>
                    )}
                    <Link
                      href={`/listing/${t.listing_id}`}
                      className="rounded-lg border border-par-3-punch/30 text-par-3-punch px-4 py-2 text-sm font-medium hover:bg-par-3-punch/10 transition-colors"
                    >
                      View listing
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
