/**
 * Wall-clock helpers for the shop timezone.
 *
 * All absolute moments are stored in PostgreSQL as timestamptz (UTC) and shown
 * to the user in Asia/Tashkent. Uzbekistan does not observe DST, so the offset
 * is a fixed +05:00 — kept as a named constant so the assumption is explicit.
 * `settings.timezone` is still stored for a future multi-timezone shop.
 */
export const TASHKENT_OFFSET_MIN = 5 * 60;

export interface WallTime {
  /** Calendar day in the shop timezone, YYYY-MM-DD. */
  date: string;
  /** Minutes since midnight in the shop timezone. */
  minutes: number;
  /** ISO weekday: 1 = Monday … 7 = Sunday. Matches working_hours.weekday. */
  weekdayIso: number;
}

export function toWall(instant: Date, offsetMin = TASHKENT_OFFSET_MIN): WallTime {
  const shifted = new Date(instant.getTime() + offsetMin * 60_000);
  return {
    date: shifted.toISOString().slice(0, 10),
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
    weekdayIso: ((shifted.getUTCDay() + 6) % 7) + 1,
  };
}

/** Midnight + `minutes` of a shop-timezone calendar day, as a UTC instant. */
export function wallToUtc(date: string, minutes: number, offsetMin = TASHKENT_OFFSET_MIN): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, minutes) - offsetMin * 60_000);
}

export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  return (
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day
  );
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

/** "HH:MM" for wall-clock minutes. */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/** "HH:MM" back to wall-clock minutes. */
export function timeToMinutes(time: string): number {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
}

/**
 * Prisma `TIME` columns (`working_hours`, `breaks`) to wall-clock minutes.
 * Accepts a string as well, in case the driver returns the raw TIME value.
 */
export function dbTimeToMinutes(value: Date | string): number {
  if (typeof value === "string") return timeToMinutes(value);
  return value.getUTCHours() * 60 + value.getUTCMinutes();
}
