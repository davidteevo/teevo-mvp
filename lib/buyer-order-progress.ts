import { FulfilmentStatus } from "@/lib/fulfilment";

export const BUYER_ORDER_STEPS = [
  {
    id: "confirmed",
    label: "Order confirmed",
    shortLabel: "Confirmed",
    description: "We've received your payment.",
  },
  {
    id: "preparing",
    label: "Preparing for dispatch",
    shortLabel: "Preparing",
    description: "The seller is securely packaging your item.",
  },
  {
    id: "shipped",
    label: "Shipped",
    shortLabel: "Shipped",
    description: "Your order is on its way.",
  },
  {
    id: "delivered",
    label: "Delivered",
    shortLabel: "Delivered",
    description: "Confirm you've received your item to complete the order.",
  },
  {
    id: "completed",
    label: "Completed",
    shortLabel: "Completed",
    description: "This order is complete.",
  },
] as const;

export type BuyerOrderStepId = (typeof BUYER_ORDER_STEPS)[number]["id"];

export type BuyerOrderProgressInput = {
  status?: string | null;
  fulfilment_status?: string | null;
  order_state?: string | null;
};

export type BuyerOrderProgress = {
  steps: typeof BUYER_ORDER_STEPS;
  currentIndex: number;
  current: (typeof BUYER_ORDER_STEPS)[number];
  isTerminal: boolean;
  outcome: "progress" | "refunded" | "dispute";
};

function currentIndexFromTx(tx: BuyerOrderProgressInput): number {
  const status = (tx.status ?? "").toLowerCase();
  const fulfilment = tx.fulfilment_status ?? "";
  const orderState = (tx.order_state ?? "").toLowerCase();

  if (
    status === "complete" ||
    fulfilment === FulfilmentStatus.COMPLETED ||
    orderState === "completed"
  ) {
    return 4;
  }
  if (fulfilment === FulfilmentStatus.DELIVERED || orderState === "delivered") {
    return 3;
  }
  if (
    status === "shipped" ||
    fulfilment === FulfilmentStatus.SHIPPED ||
    orderState === "shipped"
  ) {
    return 2;
  }
  // Paid / packaging / label created all collapse to "Preparing for dispatch"
  return 1;
}

/**
 * Maps internal fulfilment/order fields to buyer-facing milestones.
 * Packaging review, labels, and fulfilment provider are never exposed.
 */
export function getBuyerOrderProgress(tx: BuyerOrderProgressInput): BuyerOrderProgress {
  const status = (tx.status ?? "").toLowerCase();
  if (status === "refunded") {
    return {
      steps: BUYER_ORDER_STEPS,
      currentIndex: 0,
      current: BUYER_ORDER_STEPS[0],
      isTerminal: true,
      outcome: "refunded",
    };
  }
  if (status === "dispute") {
    return {
      steps: BUYER_ORDER_STEPS,
      currentIndex: 0,
      current: BUYER_ORDER_STEPS[0],
      isTerminal: true,
      outcome: "dispute",
    };
  }

  const currentIndex = currentIndexFromTx(tx);
  return {
    steps: BUYER_ORDER_STEPS,
    currentIndex,
    current: BUYER_ORDER_STEPS[currentIndex],
    isTerminal: currentIndex === 4,
    outcome: "progress",
  };
}
