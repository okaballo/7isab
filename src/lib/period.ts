import { addDays, addMonths, differenceInCalendarDays, format, getDaysInMonth, parseISO } from 'date-fns';

export const iso = (d: Date) => format(d, 'yyyy-MM-dd');
export const todayISO = () => iso(new Date());

/** The income day in a given month, clamped to the month's length (31 → Feb 28/29). */
function incomeDateIn(year: number, month: number, incomeDay: number): Date {
  const day = Math.min(incomeDay, getDaysInMonth(new Date(year, month, 1)));
  return new Date(year, month, day);
}

/** Budget period containing `date`: from income day to the day before the next income day. */
export function periodFor(date: string, incomeDay: number): { startDate: string; endDate: string } {
  const d = parseISO(date);
  let start = incomeDateIn(d.getFullYear(), d.getMonth(), incomeDay);
  if (d < start) {
    const prev = addMonths(new Date(d.getFullYear(), d.getMonth(), 1), -1);
    start = incomeDateIn(prev.getFullYear(), prev.getMonth(), incomeDay);
  }
  const nextMonth = addMonths(new Date(start.getFullYear(), start.getMonth(), 1), 1);
  const nextStart = incomeDateIn(nextMonth.getFullYear(), nextMonth.getMonth(), incomeDay);
  return { startDate: iso(start), endDate: iso(addDays(nextStart, -1)) };
}

/** Days left in the period, counting today. Never below 1. */
export function daysLeft(today: string, endDate: string): number {
  return Math.max(1, differenceInCalendarDays(parseISO(endDate), parseISO(today)) + 1);
}

/** Fraction of the period that has passed, counting today as passed (0..1). */
export function elapsedFraction(today: string, startDate: string, endDate: string): number {
  const total = differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1;
  const done = differenceInCalendarDays(parseISO(today), parseISO(startDate)) + 1;
  return Math.min(1, Math.max(0, done / total));
}

/** "November" for a period starting in November. */
export const periodLabel = (startDate: string) => format(parseISO(startDate), 'MMMM');
export const shortLabel = (startDate: string) => format(parseISO(startDate), 'MMM yy');
