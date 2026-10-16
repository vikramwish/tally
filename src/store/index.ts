import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { EXERCISES } from '../lib/exercises';
import { uid } from '../lib/format';
import { detectPRs, previousSets, type PR } from '../lib/stats';
import type { Exercise, Folder, Measurement, Routine, Settings, Workout, WorkoutExercise, WorkoutSet } from '../lib/types';
import * as ops from './ops';

export const DEFAULT_SETTINGS: Settings = {
  unit: 'kg',
  defaultRestSec: 120,
  barWeightKg: 20,
  platesKg: [25, 20, 15, 10, 5, 2.5, 1.25],
  previousFrom: 'any',
  rpeEnabled: true,
  keepAwake: true,
  restHaptics: true,
  restNotification: true,
  autoStartRest: true,
  weeklyGoal: 4,
};

export interface RestTimer {
  endsAt: number;
  totalSec: number;
}

interface Data {
  customExercises: Exercise[];
  routines: Routine[];
  folders: Folder[];
  history: Workout[];
  active: Workout | null;
  rest: RestTimer | null;
  measurements: Measurement[];
  settings: Settings;
  /** The routine being created or edited. */
  routineDraft: Routine | null;
}

interface Actions {
  // workout lifecycle
  startEmptyWorkout: () => void;
  startRoutine: (routineId: string) => void;
  updateActive: (fn: (w: Workout) => Workout) => void;
  completeOrUndoSet: (weId: string, setId: string) => { completed: boolean; restSec: number };
  finishWorkout: (opts: { name: string; notes: string; updateRoutine: boolean }) => { workout: Workout; prs: PR[] } | null;
  discardWorkout: () => void;
  // rest timer
  startRest: (sec: number) => void;
  adjustRest: (deltaSec: number) => void;
  stopRest: () => void;
  // history
  deleteWorkout: (id: string) => void;
  // routines
  beginRoutineDraft: (routineId?: string, folderId?: string | null) => void;
  updateDraft: (fn: (r: Routine) => Routine) => void;
  saveDraft: () => Routine | null;
  cancelDraft: () => void;
  deleteRoutine: (id: string) => void;
  duplicateRoutine: (id: string) => void;
  saveWorkoutAsRoutine: (workoutId: string, name: string) => Routine | null;
  addFolder: (name: string) => Folder;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  // exercises
  addCustomExercise: (e: Omit<Exercise, 'id' | 'custom'>) => Exercise;
  // body
  addMeasurement: (m: Omit<Measurement, 'id'>) => void;
  deleteMeasurement: (id: string) => void;
  // settings
  updateSettings: (patch: Partial<Settings>) => void;
  resetAll: () => void;
}

export type State = Data & Actions;

const initialData: Data = {
  customExercises: [],
  routines: [],
  folders: [],
  history: [],
  active: null,
  rest: null,
  measurements: [],
  settings: DEFAULT_SETTINGS,
  routineDraft: null,
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...initialData,

      startEmptyWorkout: () => {
        if (get().active) return;
        const now = Date.now();
        set({ active: ops.emptyWorkout(now, ops.defaultWorkoutName(now)) });
      },

      startRoutine: (routineId) => {
        if (get().active) return;
        const r = get().routines.find((x) => x.id === routineId);
        if (!r) return;
        set({ active: ops.workoutFromRoutine(r, Date.now()) });
      },

      updateActive: (fn) => {
        const a = get().active;
        if (a) set({ active: fn(a) });
      },

      completeOrUndoSet: (weId, setId) => {
        const s = get();
        const a = s.active;
        if (!a) return { completed: false, restSec: 0 };
        const we = a.exercises.find((e) => e.id === weId);
        const prev = we ? previousForActive(s, we) : null;
        const { workout, completed } = ops.toggleSetDone(a, weId, setId, prev);
        const restSec = completed ? ops.restAfter(workout, weId) : 0;
        set({ active: workout });
        if (completed && restSec > 0 && s.settings.autoStartRest) get().startRest(restSec);
        return { completed, restSec };
      },

      finishWorkout: ({ name, notes, updateRoutine }) => {
        const s = get();
        if (!s.active) return null;
        const workout = ops.finalizeWorkout({ ...s.active, name: name.trim() || s.active.name, notes }, Date.now());
        const prs = detectPRs(workout, s.history, (id) => lookupExercise(s, id)?.kind ?? 'weight_reps');
        let routines = s.routines;
        if (updateRoutine && workout.routineId) {
          routines = routines.map((r) => (r.id === workout.routineId ? ops.updateRoutineFromWorkout(r, workout, Date.now()) : r));
        }
        set({ history: [workout, ...s.history], active: null, rest: null, routines });
        return { workout, prs };
      },

      discardWorkout: () => set({ active: null, rest: null }),

      startRest: (sec) => set({ rest: { endsAt: Date.now() + sec * 1000, totalSec: sec } }),
      adjustRest: (delta) => {
        const r = get().rest;
        if (!r) return;
        const endsAt = r.endsAt + delta * 1000;
        if (endsAt <= Date.now()) set({ rest: null });
        else set({ rest: { endsAt, totalSec: Math.max(1, r.totalSec + delta) } });
      },
      stopRest: () => set({ rest: null }),

      deleteWorkout: (id) => set({ history: get().history.filter((w) => w.id !== id) }),

      beginRoutineDraft: (routineId, folderId = null) => {
        const existing = routineId ? get().routines.find((r) => r.id === routineId) : undefined;
        set({ routineDraft: existing ? structuredCloneSafe(existing) : ops.emptyRoutine(Date.now(), folderId) });
      },
      updateDraft: (fn) => {
        const d = get().routineDraft;
        if (d) set({ routineDraft: fn(d) });
      },
      saveDraft: () => {
        const d = get().routineDraft;
        if (!d) return null;
        const saved: Routine = { ...d, name: d.name.trim() || 'Untitled routine', updatedAt: Date.now() };
        const exists = get().routines.some((r) => r.id === saved.id);
        set({
          routines: exists ? get().routines.map((r) => (r.id === saved.id ? saved : r)) : [...get().routines, saved],
          routineDraft: null,
        });
        return saved;
      },
      cancelDraft: () => set({ routineDraft: null }),
      deleteRoutine: (id) => set({ routines: get().routines.filter((r) => r.id !== id) }),
      duplicateRoutine: (id) => {
        const r = get().routines.find((x) => x.id === id);
        if (!r) return;
        const copy: Routine = { ...structuredCloneSafe(r), id: uid(), name: `${r.name} (copy)`, updatedAt: Date.now() };
        set({ routines: [...get().routines, copy] });
      },
      saveWorkoutAsRoutine: (workoutId, name) => {
        const w = get().history.find((x) => x.id === workoutId);
        if (!w) return null;
        const r = ops.routineFromWorkout(w, name.trim() || w.name, null, Date.now());
        set({ routines: [...get().routines, r] });
        return r;
      },
      addFolder: (name) => {
        const f: Folder = { id: uid(), name: name.trim() || 'New folder' };
        set({ folders: [...get().folders, f] });
        return f;
      },
      renameFolder: (id, name) => set({ folders: get().folders.map((f) => (f.id === id ? { ...f, name } : f)) }),
      deleteFolder: (id) =>
        set({
          folders: get().folders.filter((f) => f.id !== id),
          routines: get().routines.map((r) => (r.folderId === id ? { ...r, folderId: null } : r)),
        }),

      addCustomExercise: (e) => {
        const ex: Exercise = { ...e, id: `custom_${uid()}`, custom: true };
        set({ customExercises: [...get().customExercises, ex] });
        return ex;
      },

      addMeasurement: (m) =>
        set({ measurements: [...get().measurements, { ...m, id: uid() }].sort((a, b) => a.date - b.date) }),
      deleteMeasurement: (id) => set({ measurements: get().measurements.filter((m) => m.id !== id) }),

      updateSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),
      resetAll: () => set({ ...initialData }),
    }),
    {
      name: 'tally-v1',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s): Data => ({
        customExercises: s.customExercises,
        routines: s.routines,
        folders: s.folders,
        history: s.history,
        active: s.active,
        rest: s.rest,
        measurements: s.measurements,
        settings: s.settings,
        routineDraft: s.routineDraft,
      }),
      // Settings added in later versions get their defaults.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Data>;
        return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) } };
      },
    },
  ),
);

function structuredCloneSafe<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/* ------------------------------------------------------------ selectors */

const builtinById = new Map(EXERCISES.map((e) => [e.id, e]));

export function lookupExercise(s: Pick<Data, 'customExercises'>, id: string): Exercise | undefined {
  return builtinById.get(id) ?? s.customExercises.find((e) => e.id === id);
}

export function allExercises(s: Pick<Data, 'customExercises'>): Exercise[] {
  return [...EXERCISES, ...s.customExercises];
}

export function previousForActive(s: Pick<Data, 'history' | 'settings' | 'active'>, we: WorkoutExercise): WorkoutSet[] | null {
  return previousSets(s.history, we.exerciseId, {
    mode: s.settings.previousFrom,
    routineId: s.active?.routineId ?? null,
  });
}

/** Stable lookup function for components. */
export function useLookup(): (id: string) => Exercise | undefined {
  const custom = useStore((s) => s.customExercises);
  return (id: string) => builtinById.get(id) ?? custom.find((e) => e.id === id);
}

export function exerciseName(s: Pick<Data, 'customExercises'>, id: string): string {
  return lookupExercise(s, id)?.name ?? 'Unknown exercise';
}
