/**
 * Shippo shipping integration.
 * @see https://docs.goshippo.com/docs/guides_general/api_quickstart/
 */

import { Shippo } from "shippo";

const SHIPPO_API_TOKEN = process.env.SHIPPO_API_TOKEN;
/** Optional: DPD UK carrier account object ID(s) from Shippo. Comma-separated for multiple. Ensures rates are requested from this carrier (helps in test mode). */
const SHIPPO_DPD_CARRIER_ACCOUNT_IDS = process.env.SHIPPO_DPD_CARRIER_ACCOUNT_ID
  ? process.env.SHIPPO_DPD_CARRIER_ACCOUNT_ID.split(",").map((s) => s.trim()).filter(Boolean)
  : null;

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

/** UK placeholder when phone is required by carrier but we don't have one. Shippo/DPD may require phone for rate quotes. */
const UK_PHONE_PLACEHOLDER = "00000000000";

/** Teevo user address (from users table) to Shippo address. Adds phone placeholder for UK so carriers return rates. */
export function addressFromUserProfile(profile: {
  address_line1: string | null;
  address_line2?: string | null;
  address_city: string | null;
  address_postcode: string | null;
  address_country: string | null;
  display_name?: string | null;
  first_name?: string | null;
  surname?: string | null;
}): ShippoAddress {
  const country = (profile.address_country || "GB").toUpperCase().slice(0, 2);
  const normalizedCountry = country === "UK" ? "GB" : country;
  const fullName = [profile.first_name?.trim(), profile.surname?.trim()].filter(Boolean).join(" ") || profile.display_name?.trim() || null;
  return {
    name: fullName ?? "Seller",
    street1: (profile.address_line1 ?? "").trim(),
    street2: profile.address_line2?.trim() || undefined,
    city: (profile.address_city ?? "").trim(),
    zip: (profile.address_postcode ?? "").trim(),
    country: normalizedCountry,
    phone: UK_PHONE_PLACEHOLDER,
  };
}

/** Buyer shipping address (from transaction) to Shippo address. Adds phone placeholder for UK so carriers return rates. */
export function addressFromBuyer(buyer: {
  name: string;
  address_line1: string;
  address_line2?: string | null;
  address_city: string;
  address_postcode: string;
  address_country: string;
}): ShippoAddress {
  const country = (buyer.address_country || "GB").toUpperCase().slice(0, 2);
  const normalizedCountry = country === "UK" ? "GB" : country;
  return {
    name: (buyer.name || "Buyer").trim(),
    street1: buyer.address_line1.trim(),
    street2: buyer.address_line2?.trim() || undefined,
    city: buyer.address_city.trim(),
    zip: buyer.address_postcode.trim(),
    country: normalizedCountry,
    phone: UK_PHONE_PLACEHOLDER,
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

/** Error message and checklist when Shippo returns no rates. @see https://support.goshippo.com/hc/en-us/articles/360003902611 */
const NO_RATES_HINT =
  " Set SHIPPO_DPD_CARRIER_ACCOUNT_ID in your deploy env to your DPD UK carrier object ID (Shippo → Settings → Carriers). Confirm sender address (Settings → Postage), recipient address (from checkout), and parcel preset on the listing. In test mode: https://support.goshippo.com/hc/en-us/articles/360003902611";

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

  if (!from.street1?.trim() || !from.city?.trim() || !from.zip?.trim()) {
    throw new Error("Sender address is incomplete. Add a full postage address in Settings → Postage (line 1, city, postcode)." + NO_RATES_HINT);
  }
  if (!to.street1?.trim() || !to.city?.trim() || !to.zip?.trim()) {
    throw new Error("Recipient address is incomplete. Ensure the buyer's shipping address was collected at checkout." + NO_RATES_HINT);
  }
  const weightKg = parseFloat(parcel.weight);
  if (Number.isNaN(weightKg) || weightKg <= 0) {
    throw new Error("Parcel weight is missing or invalid. Each listing must have a parcel preset with weight set." + NO_RATES_HINT);
  }

  const payload = {
    addressFrom: from,
    addressTo: to,
    parcels: [parcel],
    async: false,
    ...(SHIPPO_DPD_CARRIER_ACCOUNT_IDS && SHIPPO_DPD_CARRIER_ACCOUNT_IDS.length > 0
      ? { carrierAccounts: SHIPPO_DPD_CARRIER_ACCOUNT_IDS }
      : {}),
    extra: { qr_code_requested: true },
  } as unknown as Parameters<Shippo["shipments"]["create"]>[0];

  const shipment = await shippo.shipments.create(payload);

  const rates = shipment.rates;
  if (!rates || rates.length === 0) {
    const shipmentAny = shipment as { status?: string; messages?: Array<{ source?: string; code?: string; text?: string }> };
    const status = shipmentAny.status;
    const messages = shipmentAny.messages;
    const messagesText = Array.isArray(messages) && messages.length > 0
      ? messages.map((m) => m?.text ?? m?.code ?? JSON.stringify(m)).join("; ")
      : "";
    console.warn(
      "[Shippo] No rates returned. From zip:", from.zip, "To zip:", to.zip, "Country:", to.country,
      "Parcel weight:", parcel.weight, "kg. Carrier accounts:", SHIPPO_DPD_CARRIER_ACCOUNT_IDS ? "set" : "none",
      "Status:", status, "Messages:", messagesText || "none"
    );
    const shippoDetail = [status && `Shippo status: ${status}`, messagesText && `Shippo messages: ${messagesText}`].filter(Boolean).join(". ");
    throw new Error(
      "No shipping rates available for this address." +
      (shippoDetail ? ` ${shippoDetail}.` : "") +
      NO_RATES_HINT
    );
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
