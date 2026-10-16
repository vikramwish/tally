export type Muscle =
  | 'chest'
  | 'back'
  | 'lats'
  | 'traps'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'cardio';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'kettlebell'
  | 'band'
  | 'other';

/** How a set of this exercise is measured. */
export type ExerciseKind = 'weight_reps' | 'reps_only' | 'duration';

export interface Exercise {
  id: string;
  name: string;
  equipment: Equipment;
  primary: Muscle;
  secondary: Muscle[];
  kind: ExerciseKind;
  custom?: boolean;
}

export type SetType = 'normal' | 'warmup' | 'drop' | 'failure';

export interface WorkoutSet {
  id: string;
  type: SetType;
  /** Always stored in kilograms; converted for display. */
  weightKg: number | null;
  reps: number | null;
  durationSec: number | null;
  rpe: number | null;
  done: boolean;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  note: string;
  /** Rest after a completed set, in seconds. 0 = no timer. */
  restSec: number;
  /** Exercises sharing a supersetId are performed back to back. */
  supersetId: string | null;
  sets: WorkoutSet[];
}

export interface Workout {
  id: string;
  name: string;
  routineId: string | null;
  startedAt: number;
  endedAt: number | null;
  notes: string;
  exercises: WorkoutExercise[];
}

export interface RoutineSet {
  type: SetType;
  weightKg: number | null;
  reps: number | null;
  durationSec: number | null;
}

export interface RoutineExercise {
  id: string;
  exerciseId: string;
  note: string;
  restSec: number;
  supersetId: string | null;
  sets: RoutineSet[];
}

export interface Routine {
  id: string;
  name: string;
  folderId: string | null;
  exercises: RoutineExercise[];
  updatedAt: number;
}

export interface Folder {
  id: string;
  name: string;
}

export interface Measurement {
  id: string;
  date: number;
  weightKg: number | null;
  bodyFatPct: number | null;
  waistCm: number | null;
  chestCm: number | null;
  armCm: number | null;
  thighCm: number | null;
}

export type WeightUnit = 'kg' | 'lb';

export interface Settings {
  unit: WeightUnit;
  defaultRestSec: number;
  barWeightKg: number;
  /** Plates available per side, in kg. */
  platesKg: number[];
  /** Where "previous" values come from. */
  previousFrom: 'any' | 'routine';
  rpeEnabled: boolean;
  keepAwake: boolean;
  restHaptics: boolean;
  restNotification: boolean;
  autoStartRest: boolean;
  weeklyGoal: number;
}
