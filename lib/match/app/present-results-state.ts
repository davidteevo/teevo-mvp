/**
 * Plain-English results states. These do not decide Fit, attachment, or labels.
 */

export const RESULTS_LOADING_TITLE = "Finding your fit";
export const RESULTS_LOADING_BODY =
  "Checking suitable driver heads. This can take a moment. No Fit scores are being inferred.";

export const RESULTS_REFRESH_ERROR_TITLE = "Couldn't refresh recommendations";
export const RESULTS_REFRESH_ERROR_BODY =
  "Your previous results are unchanged. Please try again.";

export const RESULTS_EMPTY_LISTINGS_TITLE = "No matching Teevo listings right now";
export const RESULTS_EMPTY_LISTINGS_BODY =
  "The model-level recommendation still applies.";

export const RESULTS_INVENTORY_UNAVAILABLE =
  "We couldn't check Teevo listings just now. Your driver recommendations are unchanged.";

export const HEAD_ONLY_UNVERIFIED_TITLE = "Head only · configuration unverified";
export const HEAD_ONLY_UNVERIFIED_BODY =
  "Shaft identity is unresolved, so this is not a complete match.";

export const HEAD_ONLY_UNSCORED_BODY =
  "Listed for this head. A complete match is not available for this configuration.";

export const HEAD_LISTING_ABSENT = "No Teevo listing for this model right now.";

export const FULL_LISTING_ASSESSED =
  "The loft and shaft on this listing were included in the match.";

/** A stored listing price, in pounds. Missing or zero prices are not shown as £0. */
export function formatListingPrice(priceMinor: number): string | null {
  if (!Number.isFinite(priceMinor) || priceMinor <= 0) return null;
  return `£${(priceMinor / 100).toFixed(2)}`;
}

/**
 * Home search for this catalogue model. Null when there is no model name to search.
 * Brand narrows the same Driver search; it is not a separate catalogue page.
 */
export function browseModelSearchHref(
  brand: string | null | undefined,
  model: string | null | undefined
): string | null {
  const modelTerm = model?.trim() ?? "";
  if (!modelTerm) return null;
  const params = new URLSearchParams();
  params.set("category", "Driver");
  const brandTerm = brand?.trim() ?? "";
  if (brandTerm) params.set("brand", brandTerm);
  params.set("search", modelTerm);
  return `/?${params.toString()}`;
}
