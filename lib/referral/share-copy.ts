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

export type CreatorToolkitPlatform = "instagram" | "tiktok" | "whatsapp" | "facebook";

export type CreatorToolkitCaption = {
  id: string;
  title: string;
  caption: string;
  platform?: CreatorToolkitPlatform | "all";
};

const MARKETPLACE_ANGLE =
  "We're building a better way to buy and sell golf gear.\n\nJoin Teevo — the marketplace built for golfers.";

const WHATSAPP_NATURAL =
  "Hey — have you heard of Teevo? It's a marketplace just for golf clubs. Thought you might fancy clearing out the garage ⛳";

/**
 * Ready-to-share captions by platform angle.
 * Admin suggested message is the default seller angle.
 */
export function creatorToolkitCaptions(
  url: string,
  suggestedMessage?: string,
  missionBody?: string
): CreatorToolkitCaption[] {
  const sellerBody = suggestedMessage?.trim() || DEFAULT_CREATOR_SUGGESTED_MESSAGE;
  const mission = (missionBody ?? "").trim();

  const captions: CreatorToolkitCaption[] = [
    {
      id: "seller-instagram",
      title: "Get golfers selling",
      caption: withCreatorLink(sellerBody, url),
      platform: "instagram",
    },
    {
      id: "seller-tiktok",
      title: "Hook — clubs gathering dust",
      caption: withCreatorLink(
        `${sellerBody.split("\n")[0] ?? sellerBody}\n\nSell them on Teevo.`,
        url
      ),
      platform: "tiktok",
    },
    {
      id: "whatsapp-natural",
      title: "Natural referral",
      caption: withCreatorLink(WHATSAPP_NATURAL, url),
      platform: "whatsapp",
    },
    {
      id: "marketplace-facebook",
      title: "Marketplace angle",
      caption: withCreatorLink(MARKETPLACE_ANGLE, url),
      platform: "facebook",
    },
    {
      id: "suggested",
      title: "Suggested message",
      caption: withCreatorLink(sellerBody, url),
      platform: "all",
    },
  ];

  if (mission && mission !== sellerBody) {
    captions.push({
      id: "mission",
      title: "Mission angle",
      caption: withCreatorLink(mission, url),
      platform: "all",
    });
  }

  return captions;
}

export function captionsForPlatform(
  captions: CreatorToolkitCaption[],
  platform: CreatorToolkitPlatform
): CreatorToolkitCaption[] {
  const filtered = captions.filter((c) => c.platform === platform || c.platform === "all");
  return filtered.length > 0 ? filtered : captions;
}

export function creatorPotentialEarningsLine(potentialPence: number): string {
  return `One great referral could earn you ${formatPoundsCompact(potentialPence)}`;
}
