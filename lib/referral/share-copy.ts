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

export const DEFAULT_CREATOR_SUGGESTED_MESSAGE =
  "Got golf clubs gathering dust?\n\nSell them on Teevo — the marketplace built for golf gear.";

/** Append creator URL to a suggested message body (without duplicating if already present). */
export function withCreatorLink(message: string, url: string): string {
  const trimmed = message.trim();
  if (!trimmed) return url;
  if (trimmed.includes(url)) return trimmed;
  return `${trimmed}\n\n${url}`;
}

/** Default creator share message for native share / WhatsApp. */
export function creatorShareMessage(url: string, suggestedMessage?: string): string {
  return withCreatorLink(suggestedMessage?.trim() || DEFAULT_CREATOR_SUGGESTED_MESSAGE, url);
}

export type CreatorToolkitCaption = {
  id: string;
  title: string;
  caption: string;
};

/** Ready-to-share captions: Admin suggested message + optional mission-derived secondary. */
export function creatorToolkitCaptions(
  url: string,
  suggestedMessage?: string,
  missionBody?: string
): CreatorToolkitCaption[] {
  const primary = withCreatorLink(
    suggestedMessage?.trim() || DEFAULT_CREATOR_SUGGESTED_MESSAGE,
    url
  );
  const captions: CreatorToolkitCaption[] = [
    {
      id: "suggested",
      title: "Suggested message",
      caption: primary,
    },
  ];
  const mission = (missionBody ?? "").trim();
  if (mission && mission !== (suggestedMessage ?? "").trim()) {
    captions.push({
      id: "mission",
      title: "Mission angle",
      caption: withCreatorLink(mission, url),
    });
  }
  return captions;
}

export function creatorPotentialEarningsLine(potentialPence: number): string {
  return `One great referral could earn you ${formatPoundsCompact(potentialPence)}`;
}
