/** Sentinel stored when the seller explicitly selects "I don't know". NULL = unanswered. */
export const SPEC_UNKNOWN = "unknown" as const;

export function isSpecUnknown(value: string | null | undefined): boolean {
  return value === SPEC_UNKNOWN;
}

/** For display: map unknown sentinel to human label; leave null/empty as missing. */
export function formatSpecValue(
  value: string | null | undefined,
  opts?: { unknownLabel?: string; appendDegree?: boolean }
): string | null {
  if (value == null || value.trim() === "") return null;
  if (isSpecUnknown(value)) return opts?.unknownLabel ?? "I don't know";
  const v = value.trim();
  if (opts?.appendDegree && !v.includes("°") && !Number.isNaN(Number(v))) {
    return `${v}°`;
  }
  return v;
}

export function toStoredSpecValue(
  value: string | null | undefined,
  opts?: { allowUnknown?: boolean }
): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed === SPEC_UNKNOWN) {
    return opts?.allowUnknown === false ? null : SPEC_UNKNOWN;
  }
  return trimmed;
}
