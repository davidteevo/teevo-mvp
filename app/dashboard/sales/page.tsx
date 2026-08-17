"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { highlightClass, useHighlightId } from "@/lib/use-highlight-id";
import { useAuth } from "@/lib/auth-context";
import { formatPrice } from "@/lib/format";
import {
  FulfilmentStatus,
  FulfilmentMode,
  ShippingPackage,
  PackagingSource,
  BOX_TYPES,
  BOX_FEE_GBP,
  PackagingStatus,
  PACKAGING_PHOTO_LABELS,
  PACKAGING_PHOTO_COUNT,
  hasShippingLabel,
  getTrackingNumber,
} from "@/lib/fulfilment";
import { getListingImageUrl } from "@/lib/listing-images";
import { DispatchDeadlineBanner } from "@/components/dashboard/DispatchDeadlineBanner";
import { RequestMoreTimeModal } from "@/components/dashboard/RequestMoreTimeModal";
import { ListingAvailabilityCard } from "@/components/dashboard/ListingAvailabilityCard";
import { canRequestDispatchExtension } from "@/lib/dispatch-display";
import { ReferralPromptCard } from "@/components/referral/ReferralPromptCard";

const PACKAGING_BUCKET = "packaging-photos";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const PACKAGING_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

function packagingPhotoTooLargeMessage(labels: string[]): string {
  if (labels.length === 1) {
    return `We couldn't upload your ${labels[0]} photo. Please choose a smaller image and try again.`;
  }
  const last = labels[labels.length - 1];
  const rest = labels.slice(0, -1).join(", ");
  return `We couldn't upload your ${rest} and ${last} photos. Please choose smaller images and try again.`;
}

function oversizedPackagingPhotoLabels(files: (File | null)[]): string[] {
  return files.flatMap((file, i) =>
    file && file.size > PACKAGING_PHOTO_MAX_BYTES ? [PACKAGING_PHOTO_LABELS[i] ?? file.name] : []
  );
}

function isPackagingPhotoTooLargeError(status: number, errText: string): boolean {
  if (status === 413) return true;
  const t = errText.toLowerCase();
  return t.includes("payload too large") || t.includes("exceeded the maximum allowed");
}

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
  fulfilment_mode?: string | null;
  shipping_package?: string | null;
  box_fee_gbp?: number | null;
  box_type?: string | null;
  shippo_label_url?: string | null;
  shippo_qr_code_url?: string | null;
  shippo_tracking_number?: string | null;
  shipping_label_url?: string | null;
  courier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  packaging_photos?: string[] | null;
  packaging_status?: string | null;
  packaging_review_notes?: string | null;
  review_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  packaging_source?: string | null;
  packaging_requested_at?: string | null;
  starter_pack_dispatched_at?: string | null;
  starter_pack_courier?: string | null;
  starter_pack_tracking_number?: string | null;
  starter_pack_tracking_url?: string | null;
  dispatch_deadline_at?: string | null;
  dispatch_clock_paused_at?: string | null;
  dispatch_clock_pause_reason?: string | null;
  dispatch_extension_status?: string | null;
  dispatch_extension_business_days?: number | null;
  cancellation_status?: string | null;
  cancellation_reason?: string | null;
  listing?: {
    model: string;
    category: string;
    brand: string;
    listing_images?: ListingImage[] | null;
    availability_confirmation_status?: string | null;
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
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-12 text-center text-mowing-green/80">Loading…</div>}>
      <DashboardSalesContent />
    </Suspense>
  );
}

function DashboardSalesContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [creatingLabelId, setCreatingLabelId] = useState<string | null>(null);
  const [packagingSubmittingId, setPackagingSubmittingId] = useState<string | null>(null);
  const [packagingPhotoSubmittingId, setPackagingPhotoSubmittingId] = useState<string | null>(null);
  const [packagingUploadStatus, setPackagingUploadStatus] = useState<PackagingUploadStatus>(null);
  const [packagingPhotoFiles, setPackagingPhotoFiles] = useState<Record<string, (File | null)[]>>({});
  const [packagingPhotoErrorById, setPackagingPhotoErrorById] = useState<Record<string, string>>({});
  const [teevoBoxType, setTeevoBoxType] = useState<string>(BOX_TYPES[0]);
  const [labelErrorById, setLabelErrorById] = useState<Record<string, string>>({});
  const [starterPackEnabled, setStarterPackEnabled] = useState(false);
  const [moreTimeTxId, setMoreTimeTxId] = useState<string | null>(null);
  const [moreTimeSubmitting, setMoreTimeSubmitting] = useState(false);
  const [referralUrl, setReferralUrl] = useState<string | null>(null);
  const highlightId = useHighlightId("sale", transactions.length > 0);

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?redirect=${encodeURIComponent("/dashboard/sales")}`);
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const fetchTransactions = () => {
      fetch("/api/transactions?role=seller")
        .then((r) => r.json())
        .then((data) => {
          setTransactions(data.transactions ?? []);
          setStarterPackEnabled(data.free_starter_pack_enabled === true);
        })
        .catch(() => setTransactions([]));
    };
    fetchTransactions();
    window.addEventListener("focus", fetchTransactions);
    fetch("/api/referral/me")
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.url === "string") setReferralUrl(data.url);
      })
      .catch(() => {
        /* optional */
      });
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

  const submitPackaging = async (
    id: string,
    shippingPackage: string,
    opts?: { boxType?: string; starterPack?: boolean }
  ) => {
    setPackagingSubmittingId(id);
    try {
      const res = await fetch(`/api/transactions/${id}/packaging`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          opts?.starterPack
            ? { shipping_package: ShippingPackage.TEEVO_BOX, starter_pack: true }
            : shippingPackage === ShippingPackage.TEEVO_BOX
              ? { shipping_package: shippingPackage, box_type: opts?.boxType ?? teevoBoxType }
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
                  fulfilment_status: data.fulfilment_status ?? (
                    opts?.starterPack ? t.fulfilment_status : FulfilmentStatus.PACKAGING_SUBMITTED
                  ),
                  shipping_package: data.shipping_package ?? shippingPackage,
                  packaging_source: data.packaging_source ?? (
                    opts?.starterPack
                      ? PackagingSource.TEEVO_STARTER_PACK
                      : shippingPackage === ShippingPackage.TEEVO_BOX
                        ? PackagingSource.TEEVO_PAID
                        : PackagingSource.SELLER_OWN
                  ),
                  box_type: data.box_type ?? (
                    shippingPackage === ShippingPackage.TEEVO_BOX && !opts?.starterPack
                      ? (opts?.boxType ?? teevoBoxType)
                      : t.box_type
                  ),
                  box_fee_gbp: data.box_fee_gbp ?? (
                    opts?.starterPack
                      ? 0
                      : shippingPackage === ShippingPackage.TEEVO_BOX
                        ? BOX_FEE_GBP[(opts?.boxType ?? teevoBoxType) as keyof typeof BOX_FEE_GBP]
                        : null
                  ),
                  packaging_requested_at: data.packaging_requested_at ?? t.packaging_requested_at,
                  starter_pack_dispatched_at: data.starter_pack_dispatched_at ?? t.starter_pack_dispatched_at,
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
    const oversizedLabels = oversizedPackagingPhotoLabels(files);
    if (oversizedLabels.length > 0) {
      const tooLargeMessage = packagingPhotoTooLargeMessage(oversizedLabels);
      setPackagingPhotoErrorById((prev) => ({ ...prev, [id]: tooLargeMessage }));
      alert(tooLargeMessage);
      return;
    }
    setPackagingPhotoErrorById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
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
          const slotIndex = files.indexOf(file);
          const label = PACKAGING_PHOTO_LABELS[slotIndex] ?? file.name;
          throw new Error(
            isPackagingPhotoTooLargeError(uploadRes.status, errText)
              ? packagingPhotoTooLargeMessage([label])
              : errText
                ? errText.slice(0, 100)
                : `Photo ${i + 1} upload failed (${uploadRes.status}). Try again.`
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
        setPackagingPhotoErrorById((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      } else {
        alert(submitData.error ?? "Failed to submit for review");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      setPackagingPhotoErrorById((prev) => ({ ...prev, [id]: message }));
      alert(message);
    } finally {
      setPackagingPhotoSubmittingId(null);
      setPackagingUploadStatus(null);
    }
  };

  const createLabel = async (id: string) => {
    setCreatingLabelId(id);
    setLabelErrorById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    try {
      const res = await fetch(`/api/transactions/${id}/shipping-label`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setLabelErrorById((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
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
        const errMsg = data.error ?? "Failed to create label";
        setLabelErrorById((prev) => ({ ...prev, [id]: errMsg }));
        alert(errMsg);
      }
    } catch (err) {
      alert("Failed to create label. Please try again.");
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
      {transactions.length > 0 && (
        <ReferralPromptCard
          title="You've sold your club on Teevo."
          body="Know someone with clubs gathering dust? Invite them to Teevo and earn credit when they start selling."
          cta="Invite a seller"
          url={referralUrl}
          variant="seller"
        />
      )}
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
              const imageUrl = imgPath ? getListingImageUrl(imgPath, "thumb") : "/placeholder-listing.svg";
              const subtitle = [listing?.category, listing?.brand].filter(Boolean).join(" · ") || null;
              const canDispatch =
                t.status === "pending" &&
                t.cancellation_status !== "in_progress" &&
                t.cancellation_status !== "completed";
              const needsAvailability =
                t.cancellation_status === "completed" &&
                t.listing?.availability_confirmation_status === "required";
              const showMoreTime = canRequestDispatchExtension(t);
              return (
                <li
                  key={t.id}
                  id={`sale-${t.id}`}
                  className={`flex flex-col gap-4 p-4${highlightClass(highlightId === t.id)}`}
                >
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
                      {t.cancellation_status === "completed" && (
                        <p className="text-xs text-divot-pink mt-0.5">
                          Cancelled — the buyer has been refunded
                        </p>
                      )}
                      {t.dispatch_extension_status === "requested" && canDispatch && (
                        <p className="text-xs text-mowing-green/70 mt-0.5">
                          Waiting for the buyer to approve extra time
                        </p>
                      )}
                      {t.shipping_package === ShippingPackage.TEEVO_BOX &&
                        t.box_fee_gbp != null &&
                        Number(t.box_fee_gbp) > 0 && (
                        <p className="text-xs text-mowing-green/60 mt-0.5">
                          Box fee £{Number(t.box_fee_gbp).toFixed(2)} deducted from your payout
                        </p>
                      )}
                    </div>
                  </Link>
                  <div className="flex flex-col gap-3 w-full min-w-0">
                    {canDispatch && (
                      <DispatchDeadlineBanner
                        dispatchDeadlineAt={t.dispatch_deadline_at}
                        pausedAt={t.dispatch_clock_paused_at}
                        pauseReason={t.dispatch_clock_pause_reason}
                      />
                    )}
                    {needsAvailability && (
                      <ListingAvailabilityCard
                        transactionId={t.id}
                        listingId={t.listing_id}
                        itemName={listing?.model ?? "item"}
                        onResolved={(available) =>
                          setTransactions((prev) =>
                            prev.map((row) =>
                              row.id === t.id
                                ? {
                                    ...row,
                                    listing: row.listing
                                      ? {
                                          ...row.listing,
                                          availability_confirmation_status: available
                                            ? "confirmed_available"
                                            : "confirmed_unavailable",
                                        }
                                      : row.listing,
                                  }
                                : row
                            )
                          )
                        }
                      />
                    )}
                    {showMoreTime && (
                      <button
                        type="button"
                        onClick={() => setMoreTimeTxId(t.id)}
                        className="rounded-lg border border-mowing-green/20 px-3 py-1.5 text-sm font-medium text-mowing-green hover:bg-mowing-green/5 w-fit"
                      >
                        I need more time
                      </button>
                    )}
                    {(t.fulfilment_status === FulfilmentStatus.PAID || t.fulfilment_status == null) &&
                      !t.shipping_package &&
                      canDispatch &&
                      !hasShippingLabel(t) && (
                        <div className="w-full rounded-lg border border-golden-tee/30 bg-golden-tee/10 p-3 space-y-2">
                          <p className="text-sm font-medium text-mowing-green">Prepare your item for dispatch</p>
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => submitPackaging(t.id, ShippingPackage.SELLER_PACKS)}
                              disabled={packagingSubmittingId === t.id}
                              className="rounded-lg bg-mowing-green text-off-white-pique px-3 py-1.5 text-sm font-medium hover:opacity-90 disabled:opacity-70 w-fit"
                            >
                              I have suitable packaging (free)
                            </button>
                            {starterPackEnabled ? (
                              <div className="w-full rounded-lg border border-mowing-green/20 bg-white p-3 space-y-2">
                                <p className="text-sm font-medium text-mowing-green">Your Teevo Starter Pack</p>
                                <p className="text-sm text-mowing-green/80">
                                  Your shipping box is on us. We&apos;ll send you suitable packaging for your club so you can get it safely to your buyer.
                                </p>
                                <p className="text-sm font-semibold text-mowing-green">£0 — Free</p>
                                <button
                                  type="button"
                                  onClick={() => submitPackaging(t.id, ShippingPackage.TEEVO_BOX, { starterPack: true })}
                                  disabled={packagingSubmittingId === t.id}
                                  className="rounded-lg border border-par-3-punch/50 text-par-3-punch px-3 py-1.5 text-sm font-medium hover:bg-par-3-punch/10 disabled:opacity-70"
                                >
                                  Request my free box
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-2 items-center flex-wrap">
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
                            )}
                          </div>
                          {!starterPackEnabled && (
                            <p className="text-xs text-mowing-green/60">Box cost is deducted from your payout. Buyer is not charged.</p>
                          )}
                        </div>
                      )}
                    {t.packaging_source === PackagingSource.TEEVO_STARTER_PACK &&
                      !t.starter_pack_dispatched_at &&
                      canDispatch &&
                      !hasShippingLabel(t) && (
                        <div className="w-full sm:w-auto max-w-md rounded-lg border border-golden-tee/30 bg-golden-tee/10 px-4 py-3">
                          <p className="text-sm font-medium text-mowing-green">Your free box is being prepared</p>
                          <p className="mt-1 text-sm text-mowing-green/80">
                            We&apos;re preparing your Teevo Starter Pack. Once it has been dispatched you can package your club and upload photos here.
                          </p>
                        </div>
                      )}
                    {t.packaging_source === PackagingSource.TEEVO_STARTER_PACK &&
                      t.starter_pack_dispatched_at &&
                      canDispatch && (
                        <div className="w-full sm:w-auto max-w-md rounded-lg border border-golden-tee/30 bg-golden-tee/10 px-4 py-3 space-y-2">
                          <p className="text-sm font-medium text-mowing-green">Your Teevo Starter Pack is on its way</p>
                          {(t.starter_pack_courier || t.starter_pack_tracking_number) && (
                            <p className="text-sm text-mowing-green/80">
                              {[t.starter_pack_courier, t.starter_pack_tracking_number].filter(Boolean).join(" · ")}
                            </p>
                          )}
                          {t.starter_pack_tracking_url ? (
                            <a
                              href={t.starter_pack_tracking_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex rounded-lg bg-mowing-green text-off-white-pique px-3 py-1.5 text-sm font-medium hover:opacity-90"
                            >
                              Track your box
                            </a>
                          ) : (
                            <p className="text-sm text-mowing-green/80">
                              Tracking will appear here once it&apos;s been added.
                            </p>
                          )}
                          {(t.packaging_status === PackagingStatus.REJECTED || t.packaging_status == null) &&
                            !hasShippingLabel(t) && (
                              <p className="text-sm text-mowing-green/80">
                                Once it arrives, package your club and upload photos below.
                              </p>
                            )}
                        </div>
                      )}
                    {t.shipping_package &&
                      !(t.packaging_source === PackagingSource.TEEVO_STARTER_PACK && !t.starter_pack_dispatched_at) &&
                      (t.packaging_status === PackagingStatus.REJECTED || t.packaging_status == null) &&
                      canDispatch &&
                      !hasShippingLabel(t) && (
                        <div className="w-full sm:w-auto rounded-lg border border-mowing-green/30 bg-mowing-green/5 p-3 space-y-2">
                          <p className="text-sm font-medium text-mowing-green">Upload packaging photos</p>
                          {packagingPhotoErrorById[t.id] && (
                            <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1" role="alert">
                              {packagingPhotoErrorById[t.id]}
                            </p>
                          )}
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
                                    if (file && file.size > PACKAGING_PHOTO_MAX_BYTES) {
                                      setPackagingPhotoErrorById((prev) => ({
                                        ...prev,
                                        [t.id]: packagingPhotoTooLargeMessage([label]),
                                      }));
                                    } else {
                                      setPackagingPhotoErrorById((prev) => {
                                        const next = { ...prev };
                                        delete next[t.id];
                                        return next;
                                      });
                                    }
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
                    {t.packaging_status === PackagingStatus.SUBMITTED && canDispatch && (
                      <span className="inline-flex items-center rounded-lg border border-golden-tee/30 bg-golden-tee/10 px-4 py-2 text-sm text-mowing-green/80">
                        Packaging under review
                      </span>
                    )}
                    {(t.packaging_status === PackagingStatus.VERIFIED ||
                      t.fulfilment_status === FulfilmentStatus.PACKAGING_VERIFIED) &&
                      canDispatch &&
                      !hasShippingLabel(t) &&
                      t.fulfilment_mode !== FulfilmentMode.MANUAL && (
                        <span className="inline-flex flex-col items-start gap-1">
                          <button
                            type="button"
                            onClick={() => createLabel(t.id)}
                            disabled={creatingLabelId === t.id}
                            className="rounded-lg bg-par-3-punch text-white px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-70"
                          >
                            {creatingLabelId === t.id ? "Creating…" : "Generate QR/Label"}
                          </button>
                          {labelErrorById[t.id] && (
                            <p className="text-sm text-red-600 max-w-md" role="alert">
                              {labelErrorById[t.id]}
                            </p>
                          )}
                        </span>
                      )}
                    {(t.packaging_status === PackagingStatus.VERIFIED ||
                      t.fulfilment_status === FulfilmentStatus.PACKAGING_VERIFIED) &&
                      canDispatch &&
                      !hasShippingLabel(t) &&
                      t.fulfilment_mode === FulfilmentMode.MANUAL && (
                        <div className="w-full sm:w-auto max-w-md rounded-lg border border-golden-tee/30 bg-golden-tee/10 px-4 py-3">
                          <p className="text-sm font-medium text-mowing-green">Preparing your shipping label</p>
                          <p className="mt-1 text-sm text-mowing-green/80">
                            We&apos;re preparing your tracked shipping label. You&apos;ll receive an email shortly with your
                            shipping label and tracking details.
                          </p>
                        </div>
                      )}
                    {canDispatch &&
                      t.fulfilment_mode === FulfilmentMode.MANUAL &&
                      !!t.shipping_label_url && (
                        <div className="w-full sm:w-auto max-w-md rounded-lg border border-mowing-green/20 bg-mowing-green/5 px-4 py-3 space-y-2">
                          <p className="text-sm font-medium text-mowing-green">Shipping label sent</p>
                          <p className="text-sm text-mowing-green/80">
                            Your shipping label and tracking details have been emailed to you. Please print the label,
                            attach it securely to your parcel, then drop it off with the courier.
                          </p>
                          <button
                            type="button"
                            onClick={() => markShipped(t.id)}
                            className="rounded-lg bg-mowing-green text-off-white-pique px-4 py-2 text-sm font-medium hover:opacity-90"
                          >
                            Mark as shipped
                          </button>
                        </div>
                      )}
                    {canDispatch && t.shippo_label_url && (
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
                    {getTrackingNumber(t) && (
                      <span className="text-sm text-mowing-green/70" title="Tracking number">
                        Track: {getTrackingNumber(t)}
                        {t.courier ? ` (${t.courier})` : ""}
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
      {moreTimeTxId && (
        <RequestMoreTimeModal
          extraBusinessDays={
            transactions.find((row) => row.id === moreTimeTxId)?.dispatch_extension_business_days ?? 3
          }
          submitting={moreTimeSubmitting}
          onClose={() => setMoreTimeTxId(null)}
          onConfirm={async () => {
            setMoreTimeSubmitting(true);
            try {
              const res = await fetch(`/api/transactions/${moreTimeTxId}/dispatch-extension`, {
                method: "POST",
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                alert(data.error ?? "Could not request more time");
                return;
              }
              setTransactions((prev) =>
                prev.map((row) =>
                  row.id === moreTimeTxId
                    ? { ...row, dispatch_extension_status: "requested" }
                    : row
                )
              );
              setMoreTimeTxId(null);
            } finally {
              setMoreTimeSubmitting(false);
            }
          }}
        />
      )}
    </div>
  );
}
