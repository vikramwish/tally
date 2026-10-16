import { toDisplayWeight } from './calc';
import type { WeightUnit } from './types';

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function pad2(n: number): string {
  return String(Math.floor(n)).padStart(2, '0');
}

/** 4352 -> "1:12:32", 95 -> "1:35" */
export function clock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(sec)}` : `${m}:${pad2(sec)}`;
}

/** 4352 -> "1h 12m", 300 -> "5m" */
export function duration(totalSec: number): string {
  const m = Math.round(totalSec / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

export function num(n: number, maxDecimals = 1): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: maxDecimals });
}

export function weight(kg: number | null | undefined, unit: WeightUnit, withUnit = true): string {
  if (kg == null) return '—';
  const v = num(toDisplayWeight(kg, unit), 2);
  return withUnit ? `${v} ${unit}` : v;
}

export function volume(kg: number, unit: WeightUnit): string {
  return `${num(Math.round(toDisplayWeight(kg, unit)), 0)} ${unit}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function shortDate(ts: number): string {
  const d = new Date(ts);
  return `${MONTHS[d.getMonth()]} ${pad2(d.getDate())}`;
}

export function monthName(ts: number): string {
  return MONTHS_LONG[new Date(ts).getMonth()];
}

export function relativeDay(ts: number, now = Date.now()): string {
  const a = new Date(ts);
  a.setHours(0, 0, 0, 0);
  const b = new Date(now);
  b.setHours(0, 0, 0, 0);
  const days = Math.round((b.getTime() - a.getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return shortDate(ts);
}

/** Parse a user-typed number; accepts "," as decimal separator. */
export function parseNum(text: string): number | null {
  const t = text.replace(',', '.').trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
