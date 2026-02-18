/**
 * Shippo shipping integration.
 * @see https://docs.goshippo.com/docs/guides_general/api_quickstart/
 */

import { Shippo } from "shippo";

const SHIPPO_API_TOKEN = process.env.SHIPPO_API_TOKEN;

/** Shipping service selected at checkout. Only allowlisted DPD UK services are used when buying labels. */
export const ShippingService = {
  DPD_NEXT_DAY: "DPD_NEXT_DAY",
  DPD_SHIP_TO_SHOP: "DPD_SHIP_TO_SHOP",
} as const;
export type ShippingServiceType = (typeof ShippingService)[keyof typeof ShippingService];

/**
 * Allowlisted Shippo servicelevel tokens. This is the single source of truth for which rates we may purchase.
 * Server-side enforcement: even if the Shippo carrier account has more services enabled (e.g. DPD timed,
 * weekend, express), we only ever purchase a rate whose servicelevel.token is in this list. Prevents surprise
 * purchases. Do not add timed, weekend, or other premium DPD services here.
 */
const ALLOWLISTED_SERVICELEVEL_TOKENS: Record<ShippingServiceType, string[]> = {
  [ShippingService.DPD_NEXT_DAY]: [
    "dpd_uk_next_day",
    "dpd_uk_door_to_door_next_day",
    "dpd_uk_nextday",
  ],
  [ShippingService.DPD_SHIP_TO_SHOP]: [
    "dpd_uk_ship_to_shop",
    "dpd_uk_pickup",
    "dpd_uk_parcelshop",
  ],
};

export function getShippoClient(): Shippo {
  if (!SHIPPO_API_TOKEN) {
    throw new Error("SHIPPO_API_TOKEN is not set");
  }
  return new Shippo({ apiKeyHeader: SHIPPO_API_TOKEN });
}

export type ShippoAddress = {
  name?: string;
  street1: string;
  street2?: string;
  city: string;
  state?: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
};

/** Teevo user address (from users table) to Shippo address. */
export function addressFromUserProfile(profile: {
  address_line1: string | null;
  address_line2?: string | null;
  address_city: string | null;
  address_postcode: string | null;
  address_country: string | null;
  display_name?: string | null;
}): ShippoAddress {
  const country = (profile.address_country || "GB").toUpperCase().slice(0, 2);
  return {
    name: profile.display_name ?? "Seller",
    street1: profile.address_line1 ?? "",
    street2: profile.address_line2 || undefined,
    city: profile.address_city ?? "",
    zip: profile.address_postcode ?? "",
    country: country === "UK" ? "GB" : country,
  };
}

/** Buyer shipping address (from transaction) to Shippo address. */
export function addressFromBuyer(buyer: {
  name: string;
  address_line1: string;
  address_line2?: string | null;
  address_city: string;
  address_postcode: string;
  address_country: string;
}): ShippoAddress {
  const country = (buyer.address_country || "GB").toUpperCase().slice(0, 2);
  return {
    name: buyer.name,
    street1: buyer.address_line1,
    street2: buyer.address_line2 || undefined,
    city: buyer.address_city,
    zip: buyer.address_postcode,
    country: country === "UK" ? "GB" : country,
  };
}

/** Parcel preset for listings. Stored on listing and used when buying the Shippo label. */
export const ParcelPreset = {
  GOLF_DRIVER: "GOLF_DRIVER",
  IRON_SET: "IRON_SET",
  PUTTER: "PUTTER",
  SMALL_ITEM: "SMALL_ITEM",
} as const;
export type ParcelPresetType = (typeof ParcelPreset)[keyof typeof ParcelPreset];

/** Dimensions (cm, kg) per preset. Essential for accurate DPD rates and acceptance. */
export const PARCEL_PRESET_DIMENSIONS: Record<
  ParcelPresetType,
  { length_cm: number; width_cm: number; height_cm: number; weight_kg: number }
> = {
  [ParcelPreset.GOLF_DRIVER]: { length_cm: 120, width_cm: 20, height_cm: 15, weight_kg: 2.5 },
  [ParcelPreset.IRON_SET]: { length_cm: 105, width_cm: 30, height_cm: 20, weight_kg: 6.5 },
  [ParcelPreset.PUTTER]: { length_cm: 95, width_cm: 20, height_cm: 15, weight_kg: 2 },
  [ParcelPreset.SMALL_ITEM]: { length_cm: 50, width_cm: 30, height_cm: 15, weight_kg: 2 },
};

export type ShippoParcel = {
  length: string;
  width: string;
  height: string;
  distanceUnit: "cm";
  weight: string;
  massUnit: "kg";
};

/** Build Shippo parcel from a preset. Falls back to SMALL_ITEM if preset unknown. */
export function getParcelForPreset(preset: ParcelPresetType | string | null | undefined): ShippoParcel {
  const valid = Object.values(ParcelPreset) as string[];
  const key = preset && valid.includes(preset) ? (preset as ParcelPresetType) : ParcelPreset.SMALL_ITEM;
  const d = PARCEL_PRESET_DIMENSIONS[key];
  return {
    length: String(d.length_cm),
    width: String(d.width_cm),
    height: String(d.height_cm),
    distanceUnit: "cm",
    weight: String(d.weight_kg),
    massUnit: "kg",
  };
}

const DEFAULT_PARCEL = getParcelForPreset(ParcelPreset.SMALL_ITEM);

export type CreateLabelResult = {
  labelUrl: string;
  /** When carrier supports paperless/QR (e.g. USPS, Royal Mail, Evri); null for DPD etc. */
  qrCodeUrl: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippoTransactionId: string;
};

function getServiceLevelToken(rate: { servicelevel?: { token?: string } }): string | undefined {
  return rate.servicelevel?.token;
}

/**
 * Filter rates to only those whose servicelevel.token is in the allowlist for the requested service.
 * Enforces server-side: Shippo may return timed/weekend/express rates if enabled on the carrier account;
 * we ignore them and only return a rate from the allowlist. Logs received rates when no match (for debugging).
 */
function pickAllowlistedRate(
  rates: Array<{ objectId?: string; servicelevel?: { token?: string; name?: string }; provider?: string }>,
  preferredService: ShippingServiceType
): { objectId: string } | null {
  const allowedTokens = ALLOWLISTED_SERVICELEVEL_TOKENS[preferredService];
  if (!allowedTokens.length) return null;

  const normalizedAllowed = new Set(allowedTokens.map((t) => t.toLowerCase()));
  for (const rate of rates) {
    const token = getServiceLevelToken(rate);
    if (token && normalizedAllowed.has(token.toLowerCase())) {
      const id = rate.objectId ?? (rate as { object_id?: string }).object_id;
      if (id) return { objectId: id };
    }
  }

  // No match: log what Shippo returned so you can add the right token to ALLOWLISTED_SERVICELEVEL_TOKENS
  const summary = rates.map((r) => ({
    provider: r.provider,
    token: getServiceLevelToken(r),
    name: r.servicelevel?.name,
  }));
  console.warn("[Shippo] No allowlisted rate for", preferredService, ". Received rates:", JSON.stringify(summary));
  return null;
}

/**
 * Create a Shippo shipment, pick the first allowlisted rate for the requested service, and purchase the label.
 * Only rates in ALLOWLISTED_SERVICELEVEL_TOKENS are used; any other rate returned by Shippo (e.g. timed,
 * weekend) is never purchased, regardless of Shippo account tickboxes. Throws if no allowlisted rate is found.
 */
export async function createShipmentAndPurchaseLabel(
  from: ShippoAddress,
  to: ShippoAddress,
  options: {
    preferredService?: ShippingServiceType;
    parcel?: ShippoParcel;
  } = {}
): Promise<CreateLabelResult> {
  const { preferredService = ShippingService.DPD_NEXT_DAY, parcel = DEFAULT_PARCEL } = options;
  const shippo = getShippoClient();

  const shipment = await shippo.shipments.create({
    addressFrom: from,
    addressTo: to,
    parcels: [parcel],
    async: false,
    extra: { qr_code_requested: true },
    // Shippo API supports qr_code_requested; SDK types may not include it
  } as unknown as Parameters<Shippo["shipments"]["create"]>[0]);

  const rates = shipment.rates;
  if (!rates || rates.length === 0) {
    throw new Error("No shipping rates available for this address. Check sender and recipient addresses.");
  }

  const picked = pickAllowlistedRate(rates, preferredService);
  if (!picked) {
    const allowed = ALLOWLISTED_SERVICELEVEL_TOKENS[preferredService].join(", ");
    throw new Error(
      `No allowlisted rate for ${preferredService}. Allowed tokens: ${allowed}. Check server logs for "Shippo rates (for allowlist)" to see what Shippo returned and update lib/shippo.ts if needed.`
    );
  }

  const transaction = await shippo.transactions.create({
    rate: picked.objectId,
    labelFileType: "PDF_A4",
    async: false,
  });

  if (transaction.status !== "SUCCESS") {
    const messages = (transaction as { messages?: Array<{ text?: string }> }).messages;
    throw new Error(
      Array.isArray(messages) && messages.length > 0
        ? messages.map((m) => m?.text ?? "").join("; ") || "Label purchase failed"
        : "Label purchase failed"
    );
  }

  const tx = transaction as { labelUrl?: string; qr_code_url?: string; trackingNumber?: string; trackingUrlProvider?: string; objectId?: string };
  return {
    labelUrl: tx.labelUrl ?? "",
    qrCodeUrl: tx.qr_code_url ?? null,
    trackingNumber: tx.trackingNumber ?? null,
    trackingUrl: tx.trackingUrlProvider ?? null,
    shippoTransactionId: tx.objectId ?? "",
  };
}
