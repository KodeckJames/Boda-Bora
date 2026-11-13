import type { Locale } from "@/lib/i18n/config";

// Everything is shown in Kenya time, whatever the server's or browser's time zone.
const TZ = "Africa/Nairobi";
const intlLocale = (locale: Locale) => (locale === "sw" ? "sw-KE" : "en-KE");

export const timeOf = (iso: string, locale: Locale) =>
  new Intl.DateTimeFormat(intlLocale(locale), { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));

// 0 = Monday … 6 = Sunday, in Kenya time.
export function weekdayOf(iso: string) {
  const day = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(new Date(iso));
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(day);
}

export const dateOf = (iso: string, locale: Locale) =>
  new Intl.DateTimeFormat(intlLocale(locale), { timeZone: TZ, day: "numeric", month: "short" }).format(new Date(iso));

// "2–8 Nov" for the week starting on a Monday (YYYY-MM-DD).
export function weekRange(weekStart: string, locale: Locale) {
  const start = new Date(`${weekStart}T12:00:00+03:00`);
  const end = new Date(start.getTime() + 6 * 86_400_000);
  const fmt = (d: Date, month: boolean) =>
    new Intl.DateTimeFormat(intlLocale(locale), { timeZone: TZ, day: "numeric", ...(month ? { month: "short" } : {}) }).format(d);
  return start.getUTCMonth() === end.getUTCMonth() ? `${fmt(start, false)}–${fmt(end, true)}` : `${fmt(start, true)} – ${fmt(end, true)}`;
}

export const km = (metres: number) => Math.round(metres / 100) / 10;
export const minutesBetween = (from: string, to: string) => Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 60_000));
export const pct = (share: number | null | undefined) => (share === null || share === undefined ? null : Math.round(share * 100));
export const round = (n: number) => Math.round(n);

export const ksh = (n: number, locale: Locale) => `KSh ${n.toLocaleString(intlLocale(locale))}`;
export const number = (n: number, locale: Locale) => n.toLocaleString(intlLocale(locale));

// Today / yesterday / weekday + date, for trip lists.
export function dayLabel(iso: string, locale: Locale, words: { today: string; yesterday: string }) {
  const key = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
  const day = key(new Date(iso));
  if (day === key(new Date())) return words.today;
  if (day === key(new Date(Date.now() - 86_400_000))) return words.yesterday;
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: TZ, weekday: "short", day: "numeric", month: "short" }).format(new Date(iso));
}
