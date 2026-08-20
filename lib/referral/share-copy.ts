import { formatPoundsCompact } from "@/lib/pricing";

export function buyerShareMessage(url: string, discountPence = 500): string {
  const discount = formatPoundsCompact(discountPence);
  return `I'm using Teevo to buy and sell golf clubs. You can get ${discount} towards your first purchase with my link: ${url}`;
}

export function sellerShareMessage(url: string, listingRewardPence = 500): string {
  const reward = formatPoundsCompact(listingRewardPence);
  return `Know someone with clubs gathering dust? Invite them to sell on Teevo — you'll both get ${reward} Teevo credit when their first listing is approved: ${url}`;
}

export function supplyShareMessage(url: string, listingRewardPence = 500): string {
  return sellerShareMessage(url, listingRewardPence);
}

export function demandShareMessage(url: string, discountPence = 500): string {
  return buyerShareMessage(url, discountPence);
}
