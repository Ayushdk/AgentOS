/**
 * Date utilities for AgentOS Calendar & Dashboards.
 * Prevents UTC timezone drift when handling date-only (YYYY-MM-DD) strings.
 */

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAYS_FULL = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

/**
 * Returns YYYY-MM-DD representing the date in the user's local timezone.
 */
export function toLocalDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Parses YYYY-MM-DD into discrete numeric components and calculates
 * local day of week without UTC parsing shifts.
 */
export function parseDateOnly(dateStr: string): {
  year: number;
  month: number; // 0-indexed (0 = Jan, 9 = Oct)
  day: number;
  weekday: number; // 0 = Sun, 6 = Sat
  isWeekend: boolean;
} {
  const parts = dateStr.slice(0, 10).split("-").map((p) => parseInt(p, 10));
  const year = parts[0];
  const month = parts[1] - 1;
  const day = parts[2];
  const dateObj = new Date(year, month, day);
  const weekday = dateObj.getDay();
  return {
    year,
    month,
    day,
    weekday,
    isWeekend: weekday === 0 || weekday === 6,
  };
}

/**
 * Formats YYYY-MM-DD for human display safely:
 * e.g., "Sunday, October 11, 2026"
 */
export function formatDisplayDate(dateStr: string): string {
  try {
    const { year, month, day, weekday } = parseDateOnly(dateStr);
    return `${WEEKDAYS_FULL[weekday]}, ${MONTH_NAMES[month]} ${day}, ${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Short date format: "11 Oct 2026"
 */
export function formatShortDate(dateStr: string): string {
  try {
    const { year, month, day } = parseDateOnly(dateStr);
    return `${day} ${MONTH_NAMES_SHORT[month]} ${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Calculates human-readable difference in days from a reference date (default: now).
 */
export function computeDaysAway(targetDateStr: string, refDate: Date = new Date()): string {
  try {
    const { year, month, day } = parseDateOnly(targetDateStr);
    const target = new Date(year, month, day);
    const today = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "today";
    if (diffDays === 1) return "tomorrow";
    if (diffDays === -1) return "yesterday";
    if (diffDays > 1) return `in ${diffDays} days`;
    return `${Math.abs(diffDays)} days ago`;
  } catch {
    return "";
  }
}

export interface CalendarCell {
  dayNumber: number;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  weekday: number;
  isWeekend: boolean;
}

/**
 * Generates the full 35 or 42 grid cells for a given month and year.
 * Handles month boundaries and leap years correctly.
 */
export function generateCalendarCells(
  year: number,
  month: number, // 0-indexed
  todayDateStr: string = toLocalDateString()
): CalendarCell[] {
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate(); // handles leap year
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: CalendarCell[] = [];

  // Previous month overflow cells
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const prevDay = daysInPrevMonth - i;
    const prevDate = new Date(year, month - 1, prevDay);
    const dateStr = toLocalDateString(prevDate);
    cells.push({
      dayNumber: prevDay,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayDateStr,
      weekday: prevDate.getDay(),
      isWeekend: prevDate.getDay() === 0 || prevDate.getDay() === 6,
    });
  }

  // Current month cells
  for (let d = 1; d <= daysInMonth; d++) {
    const curDate = new Date(year, month, d);
    const dateStr = toLocalDateString(curDate);
    cells.push({
      dayNumber: d,
      dateStr,
      isCurrentMonth: true,
      isToday: dateStr === todayDateStr,
      weekday: curDate.getDay(),
      isWeekend: curDate.getDay() === 0 || curDate.getDay() === 6,
    });
  }

  // Next month overflow cells to fill 35 or 42 cells (complete 7-day rows)
  const remainingCells = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
  for (let d = 1; d <= remainingCells; d++) {
    const nextDate = new Date(year, month + 1, d);
    const dateStr = toLocalDateString(nextDate);
    cells.push({
      dayNumber: d,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayDateStr,
      weekday: nextDate.getDay(),
      isWeekend: nextDate.getDay() === 0 || nextDate.getDay() === 6,
    });
  }

  return cells;
}
