"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Drawer } from "vaul";
import { X } from "lucide-react";
import {
  ADMIN_ACTION_LABELS,
  AdminActionType,
  type AdminActionItem,
} from "@/lib/admin-action-centre";
import type { AdminActionDetail } from "@/lib/admin-action-centre-data";
import { ListingVerificationReview } from "./ListingVerificationReview";
import { PackagingVerificationReview } from "./PackagingVerificationReview";
import { StarterPackDispatchReview } from "./StarterPackDispatchReview";
import { ShippingLabelReview } from "./ShippingLabelReview";
import { FeedbackReviewPanel } from "./FeedbackReviewPanel";

export function AdminActionReviewDrawer({
  item,
  queue,
  open,
  onOpenChange,
  onAdvanceTo,
  onCompleted,
  onAlreadyProcessed,
}: {
  item: AdminActionItem | null;
  queue: AdminActionItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdvanceTo: (next: AdminActionItem | null) => void;
  onCompleted: (itemId: string, keepInQueue: boolean) => void;
  onAlreadyProcessed: (itemId: string) => void;
}) {
  const [desktop, setDesktop] = useState(false);
  const [detail, setDetail] = useState<AdminActionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [alreadyProcessed, setAlreadyProcessed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!open || !item) {
      setDetail(null);
      setSuccess(null);
      setAlreadyProcessed(false);
      setLoadError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setSuccess(null);
    setAlreadyProcessed(false);
    setDetail(null);
    fetch(
      `/api/admin/action-centre/item?actionType=${encodeURIComponent(item.actionType)}&entityId=${encodeURIComponent(item.entityId)}`
    )
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Failed to load");
        if (!cancelled) setDetail(data.detail as AdminActionDetail);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, item?.id]);

  const idx = item ? queue.findIndex((q) => q.id === item.id) : -1;
  const nextItem = idx >= 0 ? queue[idx + 1] ?? null : queue[0] ?? null;

  const handleSuccess = (message: string, opts?: { keepInQueue?: boolean }) => {
    if (!item) return;
    setSuccess(message);
    onCompleted(item.id, opts?.keepInQueue === true);
  };

  const handleAlreadyProcessed = () => {
    if (!item) return;
    setAlreadyProcessed(true);
    setSuccess("This item has already been processed.");
    onAlreadyProcessed(item.id);
  };

  const goNext = () => {
    if (nextItem) onAdvanceTo(nextItem);
    else {
      onAdvanceTo(null);
      onOpenChange(false);
    }
  };

  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      direction={desktop ? "right" : "bottom"}
      shouldScaleBackground={false}
      repositionInputs={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[100] bg-black/40" />
        <Drawer.Content
          className={
            desktop
              ? "fixed inset-y-0 right-0 z-[101] flex w-full max-w-[52rem] flex-col bg-white outline-none shadow-xl"
              : "fixed bottom-0 left-0 right-0 z-[101] flex max-h-[92vh] flex-col rounded-t-2xl bg-white outline-none"
          }
        >
          <Drawer.Title className="sr-only">
            {item ? ADMIN_ACTION_LABELS[item.actionType] : "Review action"}
          </Drawer.Title>
          <Drawer.Description className="sr-only">Complete this admin action without leaving Overview.</Drawer.Description>
          {!desktop && <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-mowing-green/20" aria-hidden />}
          <div className="flex items-start justify-between gap-3 border-b border-par-3-punch/20 px-4 py-3 shrink-0">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-mowing-green/70">
                {item ? ADMIN_ACTION_LABELS[item.actionType] : "Action"}
              </p>
              <p className="font-semibold text-mowing-green">{item?.title}</p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full p-2 text-mowing-green/70 hover:bg-mowing-green/10"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            {success && (
              <div className="mb-4 rounded-lg border border-par-3-punch/30 bg-par-3-punch/10 px-3 py-2 text-sm text-mowing-green">
                <p className="font-medium">{success}</p>
                {alreadyProcessed && (
                  <p className="mt-1 text-mowing-green/70">The queue has been refreshed.</p>
                )}
                <button
                  type="button"
                  onClick={goNext}
                  className="mt-2 text-sm font-semibold text-par-3-punch hover:underline"
                >
                  {nextItem ? "Review next →" : "Back to Action Centre"}
                </button>
              </div>
            )}
            {loading && <p className="text-sm text-mowing-green/70">Loading details…</p>}
            {loadError && (
              <p className="text-sm text-divot-pink" role="alert">
                {loadError}
              </p>
            )}
            {!loading && !loadError && !success && detail && item && (
              <>
                {detail.actionType === AdminActionType.VERIFY_LISTING && (
                  <ListingVerificationReview
                    detail={detail}
                    onSuccess={handleSuccess}
                    onAlreadyProcessed={handleAlreadyProcessed}
                  />
                )}
                {detail.actionType === AdminActionType.REVIEW_PACKAGING && (
                  <PackagingVerificationReview
                    detail={detail}
                    onSuccess={handleSuccess}
                    onAlreadyProcessed={handleAlreadyProcessed}
                  />
                )}
                {detail.actionType === AdminActionType.DISPATCH_STARTER_PACK && (
                  <StarterPackDispatchReview
                    detail={detail}
                    onSuccess={handleSuccess}
                    onAlreadyProcessed={handleAlreadyProcessed}
                  />
                )}
                {detail.actionType === AdminActionType.CREATE_LABEL && (
                  <ShippingLabelReview
                    detail={detail}
                    onSuccess={handleSuccess}
                    onAlreadyProcessed={handleAlreadyProcessed}
                  />
                )}
                {detail.actionType === AdminActionType.REVIEW_FEEDBACK && (
                  <FeedbackReviewPanel
                    detail={detail}
                    onSuccess={handleSuccess}
                    onAlreadyProcessed={handleAlreadyProcessed}
                  />
                )}
              </>
            )}
          </div>
          {item && (
            <div className="shrink-0 border-t border-par-3-punch/20 px-4 py-3">
              <Link href={item.specialistHref} className="text-sm text-par-3-punch hover:underline">
                Open full page →
              </Link>
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
