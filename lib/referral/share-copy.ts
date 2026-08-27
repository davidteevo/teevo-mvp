import { formatPoundsCompact } from "@/lib/pricing";

export function buyerShareMessage(url: string, discountPence = 500): string {
  const discount = formatPoundsCompact(discountPence);
  return `I'm using Teevo to buy and sell golf clubs. You can get ${discount} towards your first purchase with my link: ${url}`;
}

export function sellerShareMessage(url: string, listingRewardPence = 500): string {
  const reward = formatPoundsCompact(listingRewardPence);
  return `Got golf clubs gathering dust? Turn them into cash on Teevo — the Vinted-like marketplace for golf gear! List your first club and, once it’s approved, we’ll both get ${reward} Teevo credit.\n\nGet started 👇\n${url}`;
}

export function supplyShareMessage(url: string, listingRewardPence = 500): string {
  return sellerShareMessage(url, listingRewardPence);
}

export function demandShareMessage(url: string, discountPence = 500): string {
  return buyerShareMessage(url, discountPence);
}

/** Default creator share message for native share / WhatsApp. */
export function creatorShareMessage(url: string): string {
  return `Got golf clubs gathering dust?\n\nSell them on Teevo — the marketplace built for golf gear.\n\n${url}`;
}

export type CreatorToolkitCaption = {
  id: string;
  title: string;
  caption: string;
};

/** MVP ready-to-share captions (no CMS). */
export function creatorToolkitCaptions(url: string): CreatorToolkitCaption[] {
  return [
    {
      id: "dust",
      title: "WhatsApp / caption",
      caption: `Got golf clubs gathering dust?\n\nSell them on Teevo — the marketplace built for golf gear.\n\n${url}`,
    },
    {
      id: "sellers",
      title: "Invite sellers",
      caption: `Know a golfer with clubs they never use?\n\nTeevo makes it easy to list and sell golf gear — verified, fair, and built for golfers.\n\n${url}`,
    },
  ];
}

export function creatorPotentialEarningsLine(potentialPence: number): string {
  return `One great referral could earn you ${formatPoundsCompact(potentialPence)}`;
}
