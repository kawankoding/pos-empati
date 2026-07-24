/**
 * Centralized date/time utilities for the POS app.
 *
 * SQLite stores `created_at` as UTC via CURRENT_TIMESTAMP, e.g. "2025-07-16 08:00:00".
 * This module consistently parses those strings as UTC and provides helpers for
 * comparison, formatting, and date-range computation.
 */

const MONTHS_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

/* ------------------------------------------------------------------ */
/*  Core: parse a SQLite UTC string into a Date                       */
/* ------------------------------------------------------------------ */

/** Parse a SQLite `created_at` string (UTC, no timezone) into a JS Date. */
export function parseUTC(isoString: string): Date {
  // Don't double-append Z if already present (e.g., from toISOString())
  const alreadyUTC = /[Zz]$|[+-]\d{2}:\d{2}$/.test(isoString);
  return new Date(alreadyUTC ? isoString : isoString + "Z");
}

/* ------------------------------------------------------------------ */
/*  Formatting                                                        */
/* ------------------------------------------------------------------ */

/** Format a UTC timestamp to local date display, e.g. "24 Jul 2025". */
export function formatDate(isoString: string): string {
  const d = parseUTC(isoString);
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
}

/** Format a UTC timestamp to local date + time, e.g. { date: "24 Jul 2025", time: "14:22" }. */
export function formatDateTime(isoString: string): { date: string; time: string } {
  const d = parseUTC(isoString);
  const date = `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return { date, time: `${hours}:${minutes}` };
}

/** Format today's date as display string, e.g. "16 Jul 2025". */
export function todayDisplay(): string {
  const now = new Date();
  return `${now.getDate()} ${MONTHS_ID[now.getMonth()]} ${now.getFullYear()}`;
}

/* ------------------------------------------------------------------ */
/*  Date strings                                                      */
/* ------------------------------------------------------------------ */

/** "YYYY-MM-DD" for today in local time. */
export function todayISO(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** "YYYY-MM-DD" for N days ago in local time. */
export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/* ------------------------------------------------------------------ */
/*  Comparison                                                        */
/* ------------------------------------------------------------------ */

/** Whether the UTC timestamp falls on today (local date). */
export function isToday(isoString: string): boolean {
  const d = parseUTC(isoString);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** Whether the UTC timestamp falls on yesterday (local date). */
export function isYesterday(isoString: string): boolean {
  const d = parseUTC(isoString);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  );
}

/** Whether the UTC timestamp is within the last N days (local time). */
export function isWithinDays(isoString: string, days: number): boolean {
  const d = parseUTC(isoString);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);
  return d >= cutoff;
}

/** Convert a "YYYY-MM-DD" local date to an ISO UTC datetime string for SQL queries. */
export function localDateToUTC(dateStr: string, isEnd: boolean): string {
  const d = new Date(`${dateStr}T${isEnd ? "23:59:59" : "00:00:00"}`);
  return d.toISOString().replace("T", " ").slice(0, 19);
}

/** Get the day-of-week index for chart: 0=Sen, 1=Sel, ..., 6=Min. */
export function dayOfWeekIndex(isoString: string): number {
  const d = parseUTC(isoString);
  // getDay(): 0=Sun, ..., 6=Sat → map to Sen(0)..Min(6)
  return d.getDay() === 0 ? 6 : d.getDay() - 1;
}

/** Day names in Indonesian, starting from Monday. */
export { DAY_NAMES };
