/** "Lea Martin" → "LM"; single names → first letter. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

import { differenceInSeconds, parseISO } from 'date-fns';

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

/** "Monday, 7 July 2026" without pulling in date-fns locales. */
export function todayLabel(): string {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
