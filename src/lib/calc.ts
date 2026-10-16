import type { WeightUnit } from './types';

export const KG_PER_LB = 0.45359237;

/** Estimated one-rep max (Epley). A single rep is its own max. */
export function estimate1RM(weightKg: number, reps: number): number {
  if (!(weightKg > 0) || !(reps > 0)) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

export function roundTo(value: number, increment: number): number {
  if (!(increment > 0)) return value;
  return Math.round(value / increment) * increment;
}

/** Trims floating noise, e.g. 102.50000001 -> 102.5 */
export function clean(n: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

export function toDisplayWeight(kg: number, unit: WeightUnit): number {
  return unit === 'kg' ? clean(kg, 2) : clean(kg / KG_PER_LB, 1);
}

export function fromDisplayWeight(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : value * KG_PER_LB;
}

export interface PlateResult {
  /** Plates for ONE side, heaviest first. */
  perSide: number[];
  /** Total weight actually loaded (bar + both sides). */
  loadedKg: number;
  /** Target minus loaded; > 0 when the target can't be hit exactly. */
  shortByKg: number;
}

/**
 * Greedy plate loading. Works in grams to avoid float drift.
 * Plates are assumed unlimited in count.
 */
export function calcPlates(targetKg: number, barKg: number, platesKg: number[]): PlateResult {
  const plates = [...new Set(platesKg)].filter((p) => p > 0).sort((a, b) => b - a);
  const perSideG = Math.max(0, Math.round(((targetKg - barKg) / 2) * 1000));
  let remaining = perSideG;
  const perSide: number[] = [];
  for (const p of plates) {
    const pg = Math.round(p * 1000);
    while (remaining >= pg) {
      perSide.push(p);
      remaining -= pg;
    }
  }
  const loadedKg = clean(barKg + (2 * (perSideG - remaining)) / 1000, 3);
  return { perSide, loadedKg, shortByKg: clean(Math.max(0, targetKg - loadedKg), 3) };
}

export interface WarmupSet {
  pct: number;
  weightKg: number;
  reps: number;
}

const WARMUP_SCHEME: Array<[number, number]> = [
  [0.4, 10],
  [0.6, 5],
  [0.8, 3],
  [0.9, 1],
];

/**
 * Warm-up ramp toward a working weight. Weights are rounded to the
 * smallest loadable increment and never go below the empty bar.
 * Duplicate weights are dropped.
 */
export function warmupSets(workKg: number, barKg: number, incrementKg = 2.5): WarmupSet[] {
  if (!(workKg > barKg)) return [];
  const out: WarmupSet[] = [];
  for (const [pct, reps] of WARMUP_SCHEME) {
    const w = clean(Math.max(barKg, roundTo(workKg * pct, incrementKg)));
    if (w >= workKg) continue;
    if (out.some((s) => s.weightKg === w)) continue;
    out.push({ pct, weightKg: w, reps });
  }
  return out;
}
