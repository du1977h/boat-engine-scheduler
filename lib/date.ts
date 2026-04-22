import {
  addMonths,
  endOfMonth,
  format,
  getDate,
  getDay,
  parseISO,
  startOfMonth,
  subMonths
} from "date-fns";

export function toDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function parseDateKey(date: string) {
  return parseISO(`${date}T00:00:00+09:00`);
}

export function getMonthRange(year: number, month: number) {
  const first = new Date(year, month - 1, 1);
  return {
    first,
    last: endOfMonth(first)
  };
}

export function listMonthDays(year: number, month: number) {
  const first = startOfMonth(new Date(year, month - 1, 1));
  const last = endOfMonth(first);
  const days: Date[] = [];

  for (let cursor = first; cursor <= last; cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)) {
    days.push(cursor);
  }

  return days;
}

export function monthNavigation(year: number, month: number) {
  const base = new Date(year, month - 1, 1);
  const prev = subMonths(base, 1);
  const next = addMonths(base, 1);
  return {
    prev: { year: prev.getFullYear(), month: prev.getMonth() + 1 },
    next: { year: next.getFullYear(), month: next.getMonth() + 1 }
  };
}

export function weekdayLabel(date: Date) {
  return ["日", "月", "火", "水", "木", "金", "土"][getDay(date)];
}

export function weekdayIndex(date: Date) {
  return getDay(date);
}

export const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"] as const;

export function dayNumber(date: Date) {
  return getDate(date);
}

export function monthLabel(year: number, month: number) {
  return `${year}年${month}月`;
}
