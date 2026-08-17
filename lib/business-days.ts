/**
 * London date helpers (Europe/London).
 * Dispatch deadlines use calendar days (weekends count; cancellation can fall on a weekend night).
 * addBusinessDays remains for buyer-approved extensions and admin overrides.
 */

export const LONDON_TZ = "Europe/London";

/** ISO dates (YYYY-MM-DD) that do not count as business days. */
export const UK_BANK_HOLIDAYS: ReadonlySet<string> = new Set([
  // 2026
  "2026-01-01",
  "2026-04-03",
  "2026-04-06",
  "2026-05-04",
  "2026-05-25",
  "2026-08-31",
  "2026-12-25",
  "2026-12-28",
  // 2027
  "2027-01-01",
  "2027-03-26",
  "2027-03-29",
  "2027-05-03",
  "2027-05-31",
  "2027-08-30",
  "2027-12-27",
  "2027-12-28",
  // 2028
  "2028-01-03",
  "2028-04-14",
  "2028-04-17",
  "2028-05-01",
  "2028-05-29",
  "2028-08-28",
  "2028-12-25",
  "2028-12-26",
]);

type LondonParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: string;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function londonParts(date: Date): LondonParts {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });
  const map: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
    weekday: map.weekday,
  };
}

function londonOffsetMs(date: Date): number {
  const p = londonParts(date);
  const ms = ((date.getTime() % 1000) + 1000) % 1000;
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, ms);
  return asUtc - date.getTime();
}

function londonWallToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  ms = 0
): Date {
  let utc = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  let offset = londonOffsetMs(new Date(utc));
  utc = Date.UTC(year, month - 1, day, hour, minute, second, ms) - offset;
  const offset2 = londonOffsetMs(new Date(utc));
  if (offset2 !== offset) {
    utc = Date.UTC(year, month - 1, day, hour, minute, second, ms) - offset2;
  }
  return new Date(utc);
}

export function londonDateString(date: Date): string {
  const p = londonParts(date);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

function addCalendarDaysToLondonDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const utcNoon = Date.UTC(y, m - 1, d, 12, 0, 0);
  const next = new Date(utcNoon + days * 24 * 60 * 60 * 1000);
  return `${next.getUTCFullYear()}-${pad2(next.getUTCMonth() + 1)}-${pad2(next.getUTCDate())}`;
}

export function isWeekendLondonDate(isoDate: string): boolean {
  const [y, m, d] = isoDate.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
  return weekday === 0 || weekday === 6;
}

export function isBusinessDay(date: Date | string, holidays: ReadonlySet<string> = UK_BANK_HOLIDAYS): boolean {
  const iso = typeof date === "string" ? date : londonDateString(date);
  if (isWeekendLondonDate(iso)) return false;
  if (holidays.has(iso)) return false;
  return true;
}

/** End of that London calendar day (23:59:59.999 Europe/London), including weekends. */
export function endOfLondonDay(date: Date | string): Date {
  const iso = typeof date === "string" ? date : londonDateString(date);
  const [y, m, d] = iso.split("-").map(Number);
  return londonWallToUtc(y, m, d, 23, 59, 59, 999);
}

/** Alias for endOfLondonDay. */
export function endOfBusinessDay(date: Date | string): Date {
  return endOfLondonDay(date);
}

/**
 * Add `n` London calendar days after `from` (the start date itself does not count).
 * Weekends and bank holidays count. Result is the end of that London day.
 */
export function addCalendarDays(from: Date, n: number): Date {
  if (!Number.isFinite(n) || n === 0) {
    return endOfLondonDay(from);
  }
  const cursor = addCalendarDaysToLondonDate(londonDateString(from), Math.trunc(n));
  return endOfLondonDay(cursor);
}

/**
 * Count London calendar dates strictly after `from` and on or before `to`.
 * Same-day returns 0. Used when resuming a paused dispatch clock.
 */
export function calendarDaysBetween(from: Date, to: Date): number {
  const start = londonDateString(from);
  const end = londonDateString(to);
  if (end <= start) return 0;
  let count = 0;
  let cursor = start;
  while (cursor < end) {
    cursor = addCalendarDaysToLondonDate(cursor, 1);
    count += 1;
  }
  return count;
}

export function previousCalendarDay(date: Date): Date {
  return addCalendarDays(date, -1);
}

/**
 * Add `n` UK business days after `from` (the start date itself does not count).
 * Result is the end of that business day in Europe/London.
 */
export function addBusinessDays(
  from: Date,
  n: number,
  holidays: ReadonlySet<string> = UK_BANK_HOLIDAYS
): Date {
  if (!Number.isFinite(n) || n === 0) {
    return endOfLondonDay(from);
  }
  const step = n > 0 ? 1 : -1;
  let remaining = Math.abs(Math.trunc(n));
  let cursor = londonDateString(from);
  while (remaining > 0) {
    cursor = addCalendarDaysToLondonDate(cursor, step);
    if (isBusinessDay(cursor, holidays)) remaining -= 1;
  }
  return endOfLondonDay(cursor);
}

/**
 * Count London business dates strictly after `from` and on or before `to`.
 * Same-day returns 0.
 */
export function businessDaysBetween(
  from: Date,
  to: Date,
  holidays: ReadonlySet<string> = UK_BANK_HOLIDAYS
): number {
  const start = londonDateString(from);
  const end = londonDateString(to);
  if (end <= start) return 0;
  let count = 0;
  let cursor = start;
  while (cursor < end) {
    cursor = addCalendarDaysToLondonDate(cursor, 1);
    if (isBusinessDay(cursor, holidays)) count += 1;
  }
  return count;
}

export function previousBusinessDay(
  date: Date,
  holidays: ReadonlySet<string> = UK_BANK_HOLIDAYS
): Date {
  return addBusinessDays(date, -1, holidays);
}

/** Display form: "Monday 17 August" (year if another London year, or if the date is already in the past). */
export function formatDispatchDeadline(iso: string | Date, now: Date = new Date()): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return "";
  const dateYear = londonParts(date).year;
  const nowYear = londonParts(now).year;
  const inPast = londonDateString(date) < londonDateString(now);
  const omitYear = dateYear === nowYear && !inPast;
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: LONDON_TZ,
    ...(omitYear ? {} : { year: "numeric" as const }),
  });
}

export type DispatchUrgency = "normal" | "approaching" | "today" | "overdue";

export function getDispatchUrgency(deadlineIso: string | Date, now: Date = new Date()): DispatchUrgency {
  const deadline = typeof deadlineIso === "string" ? new Date(deadlineIso) : deadlineIso;
  if (Number.isNaN(deadline.getTime())) return "normal";
  if (now.getTime() > deadline.getTime()) return "overdue";
  if (londonDateString(now) === londonDateString(deadline)) return "today";
  const remaining = calendarDaysBetween(now, deadline);
  if (remaining >= 1 && remaining <= 2) return "approaching";
  return "normal";
}

export function isSameLondonDate(a: Date, b: Date): boolean {
  return londonDateString(a) === londonDateString(b);
}
