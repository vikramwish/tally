/**
 * Pure, immutable operations on workouts and routines.
 * The store calls these; tests exercise them directly.
 */
import { uid } from '../lib/format';
import { previousSets } from '../lib/stats';
import type {
  Routine,
  RoutineExercise,
  RoutineSet,
  SetType,
  Settings,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from '../lib/types';

export const SET_TYPE_ORDER: SetType[] = ['normal', 'warmup', 'drop', 'failure'];

export function newSet(partial: Partial<WorkoutSet> = {}): WorkoutSet {
  return { id: uid(), type: 'normal', weightKg: null, reps: null, durationSec: null, rpe: null, done: false, ...partial };
}

export function emptyWorkout(now: number, name = 'Workout'): Workout {
  return { id: uid(), name, routineId: null, startedAt: now, endedAt: null, notes: '', exercises: [] };
}

export function defaultWorkoutName(now: number): string {
  const h = new Date(now).getHours();
  if (h < 11) return 'Morning workout';
  if (h < 17) return 'Afternoon workout';
  return 'Evening workout';
}

export function workoutFromRoutine(routine: Routine, now: number): Workout {
  return {
    id: uid(),
    name: routine.name,
    routineId: routine.id,
    startedAt: now,
    endedAt: null,
    notes: '',
    exercises: routine.exercises.map((re) => ({
      id: uid(),
      exerciseId: re.exerciseId,
      note: re.note,
      restSec: re.restSec,
      supersetId: re.supersetId,
      sets: (re.sets.length ? re.sets : [{ type: 'normal', weightKg: null, reps: null, durationSec: null } as RoutineSet]).map((s) =>
        newSet({ type: s.type, weightKg: s.weightKg, reps: s.reps, durationSec: s.durationSec }),
      ),
    })),
  };
}

/** Adds exercises with as many empty sets as last time (min 1). */
export function addExercises(w: Workout, exerciseIds: string[], history: Workout[], settings: Settings): Workout {
  const added: WorkoutExercise[] = exerciseIds.map((exerciseId) => {
    const prev = previousSets(history, exerciseId, { mode: 'any' });
    const count = Math.max(1, prev?.length ?? 1);
    return {
      id: uid(),
      exerciseId,
      note: '',
      restSec: settings.defaultRestSec,
      supersetId: null,
      sets: Array.from({ length: count }, (_, i) => newSet({ type: prev?.[i]?.type === 'warmup' ? 'warmup' : 'normal' })),
    };
  });
  return { ...w, exercises: [...w.exercises, ...added] };
}

function mapExercise(w: Workout, weId: string, fn: (e: WorkoutExercise) => WorkoutExercise): Workout {
  return { ...w, exercises: w.exercises.map((e) => (e.id === weId ? fn(e) : e)) };
}

export function updateExercise(w: Workout, weId: string, patch: Partial<Omit<WorkoutExercise, 'id' | 'sets'>>): Workout {
  return mapExercise(w, weId, (e) => ({ ...e, ...patch }));
}

export function removeExercise(w: Workout, weId: string): Workout {
  const target = w.exercises.find((e) => e.id === weId);
  let exercises = w.exercises.filter((e) => e.id !== weId);
  if (target?.supersetId) exercises = dissolveLonelySupersets(exercises);
  return { ...w, exercises };
}

export function moveExercise(w: Workout, weId: string, dir: -1 | 1): Workout {
  const i = w.exercises.findIndex((e) => e.id === weId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= w.exercises.length) return w;
  const exercises = [...w.exercises];
  [exercises[i], exercises[j]] = [exercises[j], exercises[i]];
  return { ...w, exercises };
}

/** Clears supersetId on any superset left with a single member. */
export function dissolveLonelySupersets<T extends { supersetId: string | null }>(list: T[]): T[] {
  const counts = new Map<string, number>();
  for (const e of list) if (e.supersetId) counts.set(e.supersetId, (counts.get(e.supersetId) ?? 0) + 1);
  return list.map((e) => (e.supersetId && (counts.get(e.supersetId) ?? 0) < 2 ? { ...e, supersetId: null } : e));
}

/**
 * Toggles a superset link between an exercise and the one below it.
 * Works for workouts and routines alike.
 */
export function toggleSupersetWithNext<T extends { id: string; supersetId: string | null }>(list: T[], id: string): T[] {
  const i = list.findIndex((e) => e.id === id);
  if (i < 0 || i === list.length - 1) return list;
  const cur = list[i];
  const next = list[i + 1];
  const out = [...list];
  if (cur.supersetId && next.supersetId === cur.supersetId) {
    out[i + 1] = { ...next, supersetId: null };
  } else {
    const sid = cur.supersetId ?? next.supersetId ?? uid();
    out[i] = { ...cur, supersetId: sid };
    out[i + 1] = { ...next, supersetId: sid };
  }
  return dissolveLonelySupersets(out);
}

export function addSet(w: Workout, weId: string): Workout {
  return mapExercise(w, weId, (e) => ({ ...e, sets: [...e.sets, newSet()] }));
}

export function removeSet(w: Workout, weId: string, setId: string): Workout {
  return mapExercise(w, weId, (e) => ({ ...e, sets: e.sets.filter((s) => s.id !== setId) }));
}

export function updateSet(w: Workout, weId: string, setId: string, patch: Partial<Omit<WorkoutSet, 'id'>>): Workout {
  return mapExercise(w, weId, (e) => ({ ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }));
}

export function nextSetType(t: SetType): SetType {
  return SET_TYPE_ORDER[(SET_TYPE_ORDER.indexOf(t) + 1) % SET_TYPE_ORDER.length];
}

/**
 * Marks a set done (or not). Empty inputs are filled from the matching
 * previous set, so tapping ✓ on a "same as last time" set just works.
 * Returns the workout and whether the set was completed by this call.
 */
export function toggleSetDone(
  w: Workout,
  weId: string,
  setId: string,
  previous: WorkoutSet[] | null,
): { workout: Workout; completed: boolean } {
  const e = w.exercises.find((x) => x.id === weId);
  const idx = e?.sets.findIndex((s) => s.id === setId) ?? -1;
  if (!e || idx < 0) return { workout: w, completed: false };
  const s = e.sets[idx];
  if (s.done) return { workout: updateSet(w, weId, setId, { done: false }), completed: false };
  const p = previous?.[idx];
  return {
    workout: updateSet(w, weId, setId, {
      done: true,
      weightKg: s.weightKg ?? p?.weightKg ?? null,
      reps: s.reps ?? p?.reps ?? null,
      durationSec: s.durationSec ?? p?.durationSec ?? null,
    }),
    completed: true,
  };
}

/** Rest after finishing a set: none mid-superset, else the exercise's rest. */
export function restAfter(w: Workout, weId: string): number {
  const i = w.exercises.findIndex((e) => e.id === weId);
  const e = w.exercises[i];
  if (!e) return 0;
  const next = w.exercises[i + 1];
  if (e.supersetId && next?.supersetId === e.supersetId) return 0;
  // In a superset, the last exercise's rest applies to the whole round.
  return e.restSec;
}

export function insertWarmups(w: Workout, weId: string, sets: Array<{ weightKg: number; reps: number }>): Workout {
  return mapExercise(w, weId, (e) => ({
    ...e,
    sets: [...sets.map((s) => newSet({ type: 'warmup', weightKg: s.weightKg, reps: s.reps })), ...e.sets],
  }));
}

export function incompleteSetCount(w: Workout): number {
  return w.exercises.reduce((n, e) => n + e.sets.filter((s) => !s.done).length, 0);
}

/** Drops unfinished sets and empty exercises, stamps the end time. */
export function finalizeWorkout(w: Workout, endedAt: number): Workout {
  return {
    ...w,
    endedAt,
    exercises: w.exercises
      .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) }))
      .filter((e) => e.sets.length > 0),
  };
}

function toRoutineExercise(e: WorkoutExercise): RoutineExercise {
  return {
    id: uid(),
    exerciseId: e.exerciseId,
    note: e.note,
    restSec: e.restSec,
    supersetId: e.supersetId,
    sets: e.sets.map((s) => ({ type: s.type, weightKg: s.weightKg, reps: s.reps, durationSec: s.durationSec })),
  };
}

export function routineFromWorkout(w: Workout, name: string, folderId: string | null, now: number): Routine {
  return { id: uid(), name, folderId, exercises: w.exercises.map(toRoutineExercise), updatedAt: now };
}

/** Writes the weights/reps you just did back into the routine. */
export function updateRoutineFromWorkout(r: Routine, w: Workout, now: number): Routine {
  return { ...r, exercises: w.exercises.map(toRoutineExercise), updatedAt: now };
}

export function emptyRoutine(now: number, folderId: string | null = null): Routine {
  return { id: uid(), name: '', folderId, exercises: [], updatedAt: now };
}

export function addExercisesToRoutine(r: Routine, ids: string[], restSec: number): Routine {
  return {
    ...r,
    exercises: [
      ...r.exercises,
      ...ids.map((exerciseId) => ({
        id: uid(),
        exerciseId,
        note: '',
        restSec,
        supersetId: null,
        sets: [
          { type: 'normal' as SetType, weightKg: null, reps: null, durationSec: null },
          { type: 'normal' as SetType, weightKg: null, reps: null, durationSec: null },
          { type: 'normal' as SetType, weightKg: null, reps: null, durationSec: null },
        ],
      })),
    ],
  };
}
