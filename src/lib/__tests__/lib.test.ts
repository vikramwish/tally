import { calcPlates, estimate1RM, fromDisplayWeight, toDisplayWeight, warmupSets } from '../calc';
import { clock, duration, parseNum } from '../format';
import {
  computeRecords,
  consistencyGrid,
  detectPRs,
  exerciseSeries,
  previousSets,
  prsInRange,
  setsPerMuscle,
  startOfWeek,
  summarize,
  weeklyStreak,
  workoutSetCount,
  workoutVolumeKg,
} from '../stats';
import { EXERCISES } from '../exercises';
import type { Workout, WorkoutSet } from '../types';

let n = 0;
const set = (weightKg: number | null, reps: number | null, extra: Partial<WorkoutSet> = {}): WorkoutSet => ({
  id: `s${++n}`,
  type: 'normal',
  weightKg,
  reps,
  durationSec: null,
  rpe: null,
  done: true,
  ...extra,
});

const day = (iso: string) => new Date(iso).getTime();

function workout(id: string, iso: string, exercises: Array<[string, WorkoutSet[]]>, routineId: string | null = null): Workout {
  const startedAt = day(iso);
  return {
    id,
    name: id,
    routineId,
    startedAt,
    endedAt: startedAt + 60 * 60 * 1000,
    notes: '',
    exercises: exercises.map(([exerciseId, sets], i) => ({ id: `${id}e${i}`, exerciseId, note: '', restSec: 120, supersetId: null, sets })),
  };
}

const kindOf = (id: string) => EXERCISES.find((e) => e.id === id)?.kind ?? 'weight_reps';
const lookup = (id: string) => EXERCISES.find((e) => e.id === id);

describe('calc', () => {
  it('estimates 1RM with Epley, single rep is exact', () => {
    expect(estimate1RM(100, 1)).toBe(100);
    expect(estimate1RM(102.5, 5)).toBeCloseTo(119.583, 2);
    expect(estimate1RM(0, 5)).toBe(0);
  });

  it('loads plates greedily per side', () => {
    const r = calcPlates(102.5, 20, [25, 20, 15, 10, 5, 2.5, 1.25]);
    expect(r.perSide).toEqual([25, 15, 1.25]);
    expect(r.loadedKg).toBe(102.5);
    expect(r.shortByKg).toBe(0);
  });

  it('reports when a target cannot be hit exactly', () => {
    const r = calcPlates(101, 20, [25, 10, 5, 2.5]);
    expect(r.loadedKg).toBe(100);
    expect(r.shortByKg).toBe(1);
  });

  it('handles targets below the bar', () => {
    expect(calcPlates(10, 20, [25]).perSide).toEqual([]);
  });

  it('builds a warm-up ramp that never drops below the bar', () => {
    expect(warmupSets(102.5, 20)).toEqual([
      { pct: 0.4, weightKg: 40, reps: 10 },
      { pct: 0.6, weightKg: 62.5, reps: 5 },
      { pct: 0.8, weightKg: 82.5, reps: 3 },
      { pct: 0.9, weightKg: 92.5, reps: 1 },
    ]);
    const light = warmupSets(30, 20);
    expect(light.every((s) => s.weightKg >= 20 && s.weightKg < 30)).toBe(true);
    expect(new Set(light.map((s) => s.weightKg)).size).toBe(light.length);
    expect(warmupSets(20, 20)).toEqual([]);
  });

  it('converts units both ways', () => {
    expect(toDisplayWeight(100, 'lb')).toBe(220.5);
    expect(fromDisplayWeight(225, 'lb')).toBeCloseTo(102.06, 2);
    expect(toDisplayWeight(102.5, 'kg')).toBe(102.5);
  });
});

describe('format', () => {
  it('formats clocks and durations', () => {
    expect(clock(4352)).toBe('1:12:32');
    expect(clock(95)).toBe('1:35');
    expect(duration(4352)).toBe('1h 13m');
    expect(duration(300)).toBe('5m');
  });
  it('parses numbers with comma decimals', () => {
    expect(parseNum('102,5')).toBe(102.5);
    expect(parseNum('')).toBeNull();
    expect(parseNum('abc')).toBeNull();
    expect(parseNum('-3')).toBeNull();
  });
});

describe('volume and sets', () => {
  it('ignores warm-ups and unfinished sets', () => {
    const w = workout('a', '2026-10-01T10:00:00', [
      ['bench_bb', [set(40, 10, { type: 'warmup' }), set(100, 5), set(100, 5, { done: false })]],
    ]);
    expect(workoutVolumeKg(w)).toBe(500);
    expect(workoutSetCount(w)).toBe(1);
  });
});

describe('records and PRs', () => {
  const w1 = workout('w1', '2026-09-01T10:00:00', [['bench_bb', [set(100, 5), set(100, 4)]]]);
  const w2 = workout('w2', '2026-09-08T10:00:00', [['bench_bb', [set(110, 1), set(95, 8)]]]);
  const w3 = workout('w3', '2026-09-15T10:00:00', [['bench_bb', [set(102.5, 5), set(102.5, 5)]], ['pull_up', [set(null, 12)]]]);

  it('computes all-time records', () => {
    const r = computeRecords([w1, w2, w3], 'bench_bb');
    expect(r.heaviest?.value).toBe(110);
    expect(r.best1RM?.value).toBeCloseTo(120.33, 2); // 95 x 8 beats 102.5 x 5
    expect(r.best1RM?.workoutId).toBe('w2');
    expect(r.bestSetVolume?.value).toBe(760);
    expect(r.bestSessionVolume?.value).toBe(1025);
    expect(r.repRecords[1].value).toBe(110);
    expect(r.repRecords[5].value).toBe(102.5);
    expect(r.repRecords[8].value).toBe(95);
    expect(r.sessions).toBe(3);
  });

  it('does not award PRs on the first session of an exercise', () => {
    expect(detectPRs(w1, [], kindOf)).toEqual([]);
  });

  it('detects PRs against prior sessions only, once per kind', () => {
    const prs = detectPRs(w3, [w1, w2], kindOf);
    const kinds = prs.map((p) => p.kind).sort();
    // 102.5x5 (e1RM 119.6) does not beat 95x8 (120.3); 1025 kg session beats 900
    expect(kinds).toEqual(['bestSessionVolume']);
    expect(prs[0].previous).toBe(900);
    expect(prs[0].setId).toBeUndefined();
    const w5 = workout('w5', '2026-09-16T10:00:00', [['bench_bb', [set(100, 3), set(105, 6)]]]);
    const p5 = detectPRs(w5, [w1, w2, w3], kindOf);
    const orm = p5.find((p) => p.kind === 'best1RM')!;
    expect(orm.value).toBeCloseTo(126, 5);
    expect(orm.setId).toBe(w5.exercises[0].sets[1].id);
  });

  it('lists PRs inside a date range by replaying history', () => {
    const w4 = workout('w4', '2026-09-22T10:00:00', [['bench_bb', [set(105, 5)]], ['pull_up', [set(null, 14)]]]);
    const prs = prsInRange([w4, w1, w3, w2], day('2026-09-20T00:00:00'), day('2026-10-01T00:00:00'), kindOf);
    expect(prs.every((p) => p.workoutId === 'w4')).toBe(true);
    expect(prs.map((p) => p.kind).sort()).toEqual(['best1RM', 'mostReps']);
  });
});

describe('series and previous values', () => {
  const a = workout('a', '2026-09-01T10:00:00', [['squat_bb', [set(140, 5)]]], 'legs');
  const b = workout('b', '2026-09-03T10:00:00', [['squat_bb', [set(100, 10), set(100, 10)]]], null);

  it('produces one point per session, oldest first', () => {
    const s = exerciseSeries([b, a], 'squat_bb', 'sessionVolume');
    expect(s.map((p) => p.value)).toEqual([700, 2000]);
    expect(exerciseSeries([b, a], 'squat_bb', 'heaviest').map((p) => p.value)).toEqual([140, 100]);
  });

  it('prefers the same routine when asked, else the latest session', () => {
    expect(previousSets([a, b], 'squat_bb', { mode: 'any' })?.[0].weightKg).toBe(100);
    expect(previousSets([a, b], 'squat_bb', { mode: 'routine', routineId: 'legs' })?.[0].weightKg).toBe(140);
    expect(previousSets([a, b], 'squat_bb', { mode: 'routine', routineId: 'other' })?.[0].weightKg).toBe(100);
    expect(previousSets([a, b], 'bench_bb', { mode: 'any' })).toBeNull();
  });
});

describe('calendar stats', () => {
  it('starts weeks on Monday', () => {
    const wed = day('2026-10-14T15:00:00');
    expect(new Date(startOfWeek(wed)).getDay()).toBe(1);
    expect(new Date(startOfWeek(wed)).getDate()).toBe(12);
    const sun = day('2026-10-18T23:00:00');
    expect(new Date(startOfWeek(sun)).getDate()).toBe(12);
  });

  it('counts the weekly streak without breaking on an empty current week', () => {
    const ws = [
      workout('1', '2026-09-22T10:00:00', []),
      workout('2', '2026-09-30T10:00:00', []),
      workout('3', '2026-10-07T10:00:00', []),
    ];
    // Wed Oct 14: current week empty, last 3 weeks trained
    expect(weeklyStreak(ws, day('2026-10-14T10:00:00'))).toBe(3);
    // A gap breaks it
    expect(weeklyStreak(ws, day('2026-10-21T10:00:00'))).toBe(0);
    expect(weeklyStreak([...ws, workout('4', '2026-10-13T10:00:00', [])], day('2026-10-14T10:00:00'))).toBe(4);
  });

  it('builds a consistency grid, oldest week first', () => {
    const ws = [workout('1', '2026-10-12T10:00:00', []), workout('2', '2026-10-01T10:00:00', [])];
    const g = consistencyGrid(ws, 2, day('2026-10-14T10:00:00'));
    expect(g.length).toBe(2);
    expect(g[1][0]).toBe(true); // Mon Oct 12
    expect(g[0][3]).toBe(false); // Thu Oct 8
    expect(g.flat().filter(Boolean).length).toBe(1); // Oct 1 is outside the 2 weeks
  });

  it('counts sets per muscle with half credit for secondaries', () => {
    const w = workout('m', '2026-10-13T10:00:00', [['bench_bb', [set(100, 5), set(100, 5), set(40, 10, { type: 'warmup' })]]]);
    const m = setsPerMuscle([w], lookup, day('2026-10-12T00:00:00'), day('2026-10-19T00:00:00'));
    expect(m.chest).toBe(2);
    expect(m.triceps).toBe(1);
    expect(m.shoulders).toBe(1);
  });

  it('summarizes a range', () => {
    const w = workout('s', '2026-10-13T10:00:00', [['bench_bb', [set(100, 5)]]]);
    expect(summarize([w], day('2026-10-01T00:00:00'), day('2026-11-01T00:00:00'))).toEqual({ workouts: 1, durationSec: 3600, volumeKg: 500, sets: 1 });
  });
});
