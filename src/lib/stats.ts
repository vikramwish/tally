import { estimate1RM } from './calc';
import type { Exercise, ExerciseKind, Muscle, Workout, WorkoutSet } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ sets */

/** A set that counts toward stats: completed and not a warm-up. */
export function isCounted(s: WorkoutSet): boolean {
  return s.done && s.type !== 'warmup';
}

export function setVolumeKg(s: WorkoutSet): number {
  if (!isCounted(s) || !s.weightKg || !s.reps) return 0;
  return s.weightKg * s.reps;
}

export function workoutVolumeKg(w: Workout): number {
  let v = 0;
  for (const e of w.exercises) for (const s of e.sets) v += setVolumeKg(s);
  return v;
}

export function workoutSetCount(w: Workout): number {
  let n = 0;
  for (const e of w.exercises) for (const s of e.sets) if (isCounted(s)) n++;
  return n;
}

export function workoutDurationSec(w: Workout, now = Date.now()): number {
  return Math.max(0, Math.round(((w.endedAt ?? now) - w.startedAt) / 1000));
}

function byStartAsc(a: Workout, b: Workout) {
  return a.startedAt - b.startedAt;
}

/* --------------------------------------------------------------- records */

export interface Rec {
  value: number;
  workoutId: string;
  date: number;
  setId?: string;
  weightKg?: number | null;
  reps?: number | null;
}

export interface ExerciseRecords {
  heaviest: Rec | null;
  best1RM: Rec | null;
  bestSetVolume: Rec | null;
  bestSessionVolume: Rec | null;
  mostReps: Rec | null;
  longest: Rec | null;
  /** Best weight lifted for at least N reps, keyed by N. */
  repRecords: Record<number, Rec>;
  sessions: number;
}

function emptyRecords(): ExerciseRecords {
  return {
    heaviest: null,
    best1RM: null,
    bestSetVolume: null,
    bestSessionVolume: null,
    mostReps: null,
    longest: null,
    repRecords: {},
    sessions: 0,
  };
}

function better(cur: Rec | null, value: number): boolean {
  return value > 0 && (cur === null || value > cur.value + 1e-9);
}

/** All-time records for one exercise across the given workouts. */
export function computeRecords(workouts: Workout[], exerciseId: string): ExerciseRecords {
  const r = emptyRecords();
  for (const w of [...workouts].sort(byStartAsc)) {
    let session = 0;
    let seen = false;
    for (const e of w.exercises) {
      if (e.exerciseId !== exerciseId) continue;
      seen = true;
      for (const s of e.sets) {
        if (!isCounted(s)) continue;
        const base = { workoutId: w.id, date: w.startedAt, setId: s.id, weightKg: s.weightKg, reps: s.reps };
        const wt = s.weightKg ?? 0;
        const reps = s.reps ?? 0;
        if (better(r.heaviest, wt)) r.heaviest = { ...base, value: wt };
        const orm = estimate1RM(wt, reps);
        if (better(r.best1RM, orm)) r.best1RM = { ...base, value: orm };
        const vol = wt * reps;
        if (better(r.bestSetVolume, vol)) r.bestSetVolume = { ...base, value: vol };
        if (better(r.mostReps, reps)) r.mostReps = { ...base, value: reps };
        if (better(r.longest, s.durationSec ?? 0)) r.longest = { ...base, value: s.durationSec ?? 0 };
        session += vol;
        if (wt > 0) {
          for (let n = 1; n <= Math.min(reps, 30); n++) {
            if (better(r.repRecords[n] ?? null, wt)) r.repRecords[n] = { ...base, value: wt };
          }
        }
      }
    }
    if (seen) {
      r.sessions++;
      if (better(r.bestSessionVolume, session)) {
        r.bestSessionVolume = { value: session, workoutId: w.id, date: w.startedAt };
      }
    }
  }
  return r;
}

/* ------------------------------------------------------------------- PRs */

export type PRKind = 'heaviest' | 'best1RM' | 'bestSetVolume' | 'bestSessionVolume' | 'mostReps' | 'longest';

export const PR_LABEL: Record<PRKind, string> = {
  heaviest: 'Heaviest weight',
  best1RM: 'Best est. 1RM',
  bestSetVolume: 'Best set volume',
  bestSessionVolume: 'Best session volume',
  mostReps: 'Most reps',
  longest: 'Longest set',
};

export interface PR {
  exerciseId: string;
  kind: PRKind;
  value: number;
  previous: number;
  setId?: string;
}

const KINDS_FOR: Record<ExerciseKind, PRKind[]> = {
  weight_reps: ['heaviest', 'best1RM', 'bestSetVolume', 'bestSessionVolume'],
  reps_only: ['mostReps'],
  duration: ['longest'],
};

/**
 * PRs set in `workout` compared with `prior` workouts.
 * An exercise needs at least one earlier session before it can set a PR,
 * so the first time you log something isn't flooded with records.
 * Returns at most one PR per (exercise, kind): the best one in the session.
 */
export function detectPRs(workout: Workout, prior: Workout[], kindOf: (exerciseId: string) => ExerciseKind): PR[] {
  const priorOnly = prior.filter((w) => w.id !== workout.id && w.startedAt < workout.startedAt);
  const ids = [...new Set(workout.exercises.map((e) => e.exerciseId))];
  const out: PR[] = [];
  for (const id of ids) {
    const before = computeRecords(priorOnly, id);
    if (before.sessions === 0) continue;
    const now = computeRecords([workout], id);
    for (const kind of KINDS_FOR[kindOf(id)]) {
      const prev = before[kind];
      const cur = now[kind];
      if (!cur) continue;
      const prevVal = prev?.value ?? 0;
      if (cur.value > prevVal + 1e-9) {
        out.push({ exerciseId: id, kind, value: cur.value, previous: prevVal, setId: cur.setId });
      }
    }
  }
  return out;
}

/** Every PR set in workouts that started within [from, to). */
export function prsInRange(
  all: Workout[],
  from: number,
  to: number,
  kindOf: (exerciseId: string) => ExerciseKind,
): Array<PR & { workoutId: string; date: number }> {
  const sorted = [...all].sort(byStartAsc);
  const out: Array<PR & { workoutId: string; date: number }> = [];
  sorted.forEach((w, i) => {
    if (w.startedAt < from || w.startedAt >= to) return;
    for (const pr of detectPRs(w, sorted.slice(0, i), kindOf)) {
      out.push({ ...pr, workoutId: w.id, date: w.startedAt });
    }
  });
  return out;
}

/* ---------------------------------------------------------------- series */

export type SeriesMetric = 'best1RM' | 'heaviest' | 'sessionVolume' | 'totalReps' | 'longest';

export interface SeriesPoint {
  date: number;
  value: number;
  workoutId: string;
}

/** One point per session of the exercise, oldest first. */
export function exerciseSeries(workouts: Workout[], exerciseId: string, metric: SeriesMetric): SeriesPoint[] {
  const pts: SeriesPoint[] = [];
  for (const w of [...workouts].sort(byStartAsc)) {
    const sets = w.exercises.filter((e) => e.exerciseId === exerciseId).flatMap((e) => e.sets.filter(isCounted));
    if (!sets.length) continue;
    let v = 0;
    for (const s of sets) {
      const wt = s.weightKg ?? 0;
      const reps = s.reps ?? 0;
      if (metric === 'best1RM') v = Math.max(v, estimate1RM(wt, reps));
      else if (metric === 'heaviest') v = Math.max(v, wt);
      else if (metric === 'sessionVolume') v += wt * reps;
      else if (metric === 'totalReps') v += reps;
      else v = Math.max(v, s.durationSec ?? 0);
    }
    pts.push({ date: w.startedAt, value: v, workoutId: w.id });
  }
  return pts;
}

/** Sessions that include the exercise, newest first. */
export function exerciseSessions(workouts: Workout[], exerciseId: string): Array<{ workout: Workout; sets: WorkoutSet[] }> {
  return [...workouts]
    .sort((a, b) => b.startedAt - a.startedAt)
    .map((w) => ({ workout: w, sets: w.exercises.filter((e) => e.exerciseId === exerciseId).flatMap((e) => e.sets) }))
    .filter((x) => x.sets.some((s) => s.done));
}

/**
 * The completed sets from the last time this exercise was done.
 * In 'routine' mode it prefers the last session of the same routine,
 * falling back to any session.
 */
export function previousSets(
  history: Workout[],
  exerciseId: string,
  opts: { routineId?: string | null; mode: 'any' | 'routine'; excludeWorkoutId?: string },
): WorkoutSet[] | null {
  const sorted = history.filter((w) => w.id !== opts.excludeWorkoutId).sort((a, b) => b.startedAt - a.startedAt);
  const find = (pool: Workout[]) => {
    for (const w of pool) {
      const e = w.exercises.find((x) => x.exerciseId === exerciseId && x.sets.some((s) => s.done));
      if (e) return e.sets.filter((s) => s.done);
    }
    return null;
  };
  if (opts.mode === 'routine' && opts.routineId) {
    const same = find(sorted.filter((w) => w.routineId === opts.routineId));
    if (same) return same;
  }
  return find(sorted);
}

/* ------------------------------------------------------------ calendars */

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Monday 00:00 local time of the week containing ts. */
export function startOfWeek(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  d.setDate(d.getDate() - dow);
  return d.getTime();
}

export function addDays(ts: number, days: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

export function startOfMonth(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

export function addMonths(ts: number, months: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth() + months, 1).getTime();
}

/**
 * Consecutive weeks with at least one workout. The current week only
 * breaks the streak once it's over, so an empty Monday doesn't reset it.
 */
export function weeklyStreak(workouts: Workout[], now = Date.now()): number {
  const weeks = new Set(workouts.map((w) => startOfWeek(w.startedAt)));
  let cursor = startOfWeek(now);
  if (!weeks.has(cursor)) cursor = startOfWeek(addDays(cursor, -7));
  let n = 0;
  while (weeks.has(cursor)) {
    n++;
    cursor = startOfWeek(addDays(cursor, -7));
  }
  return n;
}

/** [week][day] booleans, oldest week first, Monday first. */
export function consistencyGrid(workouts: Workout[], weeks: number, now = Date.now()): boolean[][] {
  const days = new Set(workouts.map((w) => startOfDay(w.startedAt)));
  const first = startOfWeek(addDays(startOfWeek(now), -7 * (weeks - 1)));
  const grid: boolean[][] = [];
  for (let wk = 0; wk < weeks; wk++) {
    const row: boolean[] = [];
    for (let d = 0; d < 7; d++) row.push(days.has(startOfDay(addDays(first, wk * 7 + d))));
    grid.push(row);
  }
  return grid;
}

/** This week's training days, Monday first. */
export function weekDays(workouts: Workout[], now = Date.now()): boolean[] {
  return consistencyGrid(workouts, 1, now)[0];
}

/* --------------------------------------------------------------- muscles */

/**
 * Working sets per muscle in [from, to). The primary muscle gets 1 per
 * set, each secondary muscle gets 0.5.
 */
export function setsPerMuscle(
  workouts: Workout[],
  lookup: (id: string) => Exercise | undefined,
  from: number,
  to: number,
): Partial<Record<Muscle, number>> {
  const out: Partial<Record<Muscle, number>> = {};
  for (const w of workouts) {
    if (w.startedAt < from || w.startedAt >= to) continue;
    for (const e of w.exercises) {
      const ex = lookup(e.exerciseId);
      if (!ex) continue;
      const n = e.sets.filter(isCounted).length;
      if (!n) continue;
      out[ex.primary] = (out[ex.primary] ?? 0) + n;
      for (const m of ex.secondary) out[m] = (out[m] ?? 0) + n * 0.5;
    }
  }
  return out;
}

export interface Summary {
  workouts: number;
  durationSec: number;
  volumeKg: number;
  sets: number;
}

export function summarize(workouts: Workout[], from: number, to: number): Summary {
  const s: Summary = { workouts: 0, durationSec: 0, volumeKg: 0, sets: 0 };
  for (const w of workouts) {
    if (w.startedAt < from || w.startedAt >= to) continue;
    s.workouts++;
    s.durationSec += workoutDurationSec(w);
    s.volumeKg += workoutVolumeKg(w);
    s.sets += workoutSetCount(w);
  }
  return s;
}

export { DAY_MS };
