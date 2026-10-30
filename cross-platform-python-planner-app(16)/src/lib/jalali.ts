/* Jalali (Persian) calendar helpers + date utilities.
   All ISO strings are local "YYYY-MM-DD" (no timezone shifting). */

export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];
export const WEEKDAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
export const WEEKDAYS_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

const div = (a: number, b: number) => Math.floor(a / b);

export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy: number;
  if (gy > 1600) {
    jy = 979;
    gy -= 1600;
  } else {
    jy = 0;
    gy -= 621;
  }
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy + div(gy2 + 3, 4) - div(gy2 + 99, 100) + div(gy2 + 399, 400) - 80 + gd + gdm[gm - 1];
  jy += 33 * div(days, 12053);
  days %= 12053;
  jy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    jy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  let jm: number, jd: number;
  if (days < 186) {
    jm = 1 + div(days, 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + div(days - 186, 30);
    jd = 1 + ((days - 186) % 30);
  }
  return [jy, jm, jd];
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  let gy: number;
  if (jy > 979) {
    gy = 1600;
    jy -= 979;
  } else {
    gy = 621;
  }
  let days =
    365 * jy +
    div(jy, 33) * 8 +
    div((jy % 33) + 3, 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  gy += 400 * div(days, 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * div(--days, 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    gy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const sal = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 0; gm < 13; gm++) {
    const v = sal[gm];
    if (gd <= v) break;
    gd -= v;
  }
  return [gy, gm, gd];
}

/* ---------- ISO helpers ---------- */
const pad = (n: number) => String(n).padStart(2, "0");

export function dateToISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function todayISO(): string {
  return dateToISO(new Date());
}
export function addDays(iso: string, n: number): string {
  const d = isoToDate(iso);
  d.setDate(d.getDate() + n);
  return dateToISO(d);
}
export function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((isoToDate(toISO).getTime() - isoToDate(fromISO).getTime()) / 86400000);
}
/** 0 = Saturday … 6 = Friday */
export function weekdayIndex(iso: string): number {
  return (isoToDate(iso).getDay() + 1) % 7;
}
export function startOfWeek(iso: string): string {
  return addDays(iso, -weekdayIndex(iso));
}
export function weekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/* ---------- Jalali helpers ---------- */
export type JDate = { jy: number; jm: number; jd: number };

export function toJalali(iso: string): JDate {
  const d = isoToDate(iso);
  const [jy, jm, jd] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return { jy, jm, jd };
}
export function fromJalali(jy: number, jm: number, jd: number): string {
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  return `${gy}-${pad(gm)}-${pad(gd)}`;
}
export function isJalaliLeap(jy: number): boolean {
  return toJalali(fromJalali(jy, 12, 30)).jm === 12;
}
export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeap(jy) ? 30 : 29;
}
export function jalaliMonthKey(iso: string): string {
  const { jy, jm } = toJalali(iso);
  return `${jy}-${pad(jm)}`;
}
export function monthKeyToRange(key: string): { from: string; to: string; jy: number; jm: number } {
  const [jy, jm] = key.split("-").map(Number);
  return { from: fromJalali(jy, jm, 1), to: fromJalali(jy, jm, jalaliMonthLength(jy, jm)), jy, jm };
}
export function shiftMonthKey(key: string, delta: number): string {
  const [jy, jm] = key.split("-").map(Number);
  const idx = jy * 12 + (jm - 1) + delta;
  return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`;
}
export function monthKeyLabel(key: string): string {
  const [jy, jm] = key.split("-").map(Number);
  return `${JALALI_MONTHS[jm - 1]} ${fa(jy)}`;
}

/* ---------- Formatting ---------- */
const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
export function fa(v: number | string | null | undefined): string {
  if (v === null || v === undefined) return "";
  return String(v).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}
export function formatNumber(n: number): string {
  return fa(Math.round(n).toLocaleString("en-US"));
}
export function formatMoney(n: number): string {
  return `${formatNumber(n)} تومان`;
}
export function compactMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return fa((n / 1_000_000_000).toFixed(1)) + " میلیارد";
  if (abs >= 1_000_000) return fa((n / 1_000_000).toFixed(1).replace(/\.0$/, "")) + " میلیون";
  if (abs >= 1_000) return fa(Math.round(n / 1000)) + " هزار";
  return fa(n);
}
export function formatJalali(iso: string, style: "full" | "short" | "dayMonth" | "weekday" = "full"): string {
  const { jy, jm, jd } = toJalali(iso);
  if (style === "short") return fa(`${jy}/${pad(jm)}/${pad(jd)}`);
  if (style === "dayMonth") return `${fa(jd)} ${JALALI_MONTHS[jm - 1]}`;
  if (style === "weekday") return `${WEEKDAYS[weekdayIndex(iso)]} ${fa(jd)} ${JALALI_MONTHS[jm - 1]}`;
  return `${WEEKDAYS[weekdayIndex(iso)]} ${fa(jd)} ${JALALI_MONTHS[jm - 1]} ${fa(jy)}`;
}
export function weekLabel(weekStart: string): string {
  const end = addDays(weekStart, 6);
  const a = toJalali(weekStart);
  const b = toJalali(end);
  if (a.jm === b.jm) return `${fa(a.jd)} تا ${fa(b.jd)} ${JALALI_MONTHS[a.jm - 1]} ${fa(a.jy)}`;
  return `${fa(a.jd)} ${JALALI_MONTHS[a.jm - 1]} تا ${fa(b.jd)} ${JALALI_MONTHS[b.jm - 1]} ${fa(b.jy)}`;
}
export function minutesToHM(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${fa(m)} دقیقه`;
  if (m === 0) return `${fa(h)} ساعت`;
  return `${fa(h)}:${fa(pad(m))}`;
}
export function hoursLabel(min: number): string {
  return fa((min / 60).toFixed(1).replace(/\.0$/, "")) + " ساعت";
}
export function timeToMinutes(t: string | null | undefined): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return null;
  return h * 60 + (m || 0);
}
export function pct(part: number, total: number): number {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
}
