/** "Lea Martin" → "LM"; single names → first letter. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

import { differenceInSeconds, parseISO, format, addMonths, addDays } from 'date-fns';

/** "2026-07" → "July 2026". */
export function monthLabel(ym: string): string {
  return format(parseISO(`${ym}-01`), 'MMMM yyyy');
}

/** Shift a "YYYY-MM" month by delta months, returning "YYYY-MM". */
export function shiftMonth(ym: string, delta: number): string {
  return format(addMonths(parseISO(`${ym}-01`), delta), 'yyyy-MM');
}

/** "2026-07-07" → "Mon 7 Jul". */
export function attendanceDateLabel(iso: string): string {
  return format(parseISO(iso), 'EEE d MMM');
}

/** 508 → "8h 28min"; null → "—". */
export function durationLabel(minutes: number | null): string {
  if (minutes == null) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}min` : `${m}min`;
}

/** Sum of minutes → "47h 23min" (always shows hours). */
export function totalHoursLabel(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${String(m).padStart(2, '0')}min`;
}

/**
 * Live-ticking running label from a clock-in ISO and the current time.
 * < 60min → "mm:ss" (e.g. "00:43", "43:12"); ≥ 60min → "1h 23min".
 */
export function liveRunningLabel(clockedInAt: string, now: Date): string {
  const totalSec = Math.max(0, differenceInSeconds(now, parseISO(clockedInAt)));
  const totalMin = Math.floor(totalSec / 60);
  if (totalMin >= 60) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h}h ${String(m).padStart(2, '0')}min`;
  }
  const ss = totalSec % 60;
  return `${String(totalMin).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/** Average of runningMinutes as "Xh Xmin" / "Xmin"; null when empty. */
export function averageLabel(minutesList: number[]): string | null {
  if (minutesList.length === 0) return null;
  const avg = Math.round(
    minutesList.reduce((a, b) => a + b, 0) / minutesList.length
  );
  const h = Math.floor(avg / 60);
  const m = avg % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

/** ISO string → local "HH:MM". */
export function clockInTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** ISO instant → "6 Jul" (short, for the device-enrolled line). */
export function shortDateLabel(iso: string): string {
  return format(parseISO(iso), 'd MMM');
}

/** ISO instant → "6 Jul 2026" (for the Joined column). */
export function joinedDateLabel(iso: string): string {
  return format(parseISO(iso), 'd MMM yyyy');
}

/** "2026-07-01" → "1 Jul 2026" (contract start/end dates). */
export function contractDateLabel(iso: string): string {
  return format(parseISO(iso), 'd MMM yyyy');
}

/** Shift a "YYYY-MM-DD" date by delta weeks (7-day increments). */
export function shiftWeek(iso: string, deltaWeeks: number): string {
  return format(addDays(parseISO(iso), deltaWeeks * 7), 'yyyy-MM-dd');
}

/** This week's Monday, "YYYY-MM-DD". */
export function currentWeekMonday(): string {
  const today = new Date();
  const day = today.getDay(); // 0=Sun..6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return format(addDays(today, diffToMonday), 'yyyy-MM-dd');
}

/** "HH:mm:ss" or "HH:mm" → "HH:mm"; null → "". */
export function hm(time: string | null | undefined): string {
  return time ? time.slice(0, 5) : '';
}

/** "Monday, 7 July 2026" without pulling in date-fns locales. */
export function todayLabel(): string {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
