import type { Equipment, Exercise, ExerciseKind, Muscle } from './types';

function ex(
  id: string,
  name: string,
  equipment: Equipment,
  primary: Muscle,
  secondary: Muscle[] = [],
  kind: ExerciseKind = 'weight_reps',
): Exercise {
  return { id, name, equipment, primary, secondary, kind };
}

/** Built-in exercise library. IDs are stable — never rename them. */
export const EXERCISES: Exercise[] = [
  // Chest
  ex('bench_bb', 'Bench Press (Barbell)', 'barbell', 'chest', ['triceps', 'shoulders']),
  ex('bench_db', 'Bench Press (Dumbbell)', 'dumbbell', 'chest', ['triceps', 'shoulders']),
  ex('incline_bb', 'Incline Bench Press (Barbell)', 'barbell', 'chest', ['shoulders', 'triceps']),
  ex('incline_db', 'Incline Press (Dumbbell)', 'dumbbell', 'chest', ['shoulders', 'triceps']),
  ex('chest_press_m', 'Chest Press (Machine)', 'machine', 'chest', ['triceps']),
  ex('cable_fly', 'Cable Fly', 'cable', 'chest'),
  ex('pec_deck', 'Pec Deck', 'machine', 'chest'),
  ex('push_up', 'Push-up', 'bodyweight', 'chest', ['triceps', 'shoulders'], 'reps_only'),
  ex('dip', 'Dip', 'bodyweight', 'chest', ['triceps'], 'reps_only'),
  // Back
  ex('deadlift_bb', 'Deadlift (Barbell)', 'barbell', 'back', ['hamstrings', 'glutes', 'traps']),
  ex('row_bb', 'Barbell Row', 'barbell', 'back', ['lats', 'biceps']),
  ex('row_db', 'Dumbbell Row', 'dumbbell', 'lats', ['back', 'biceps']),
  ex('seated_row', 'Seated Cable Row', 'cable', 'back', ['lats', 'biceps']),
  ex('lat_pulldown', 'Lat Pulldown', 'cable', 'lats', ['biceps']),
  ex('pull_up', 'Pull-up', 'bodyweight', 'lats', ['biceps', 'back'], 'reps_only'),
  ex('pull_up_w', 'Weighted Pull-up', 'bodyweight', 'lats', ['biceps', 'back']),
  ex('chin_up', 'Chin-up', 'bodyweight', 'lats', ['biceps'], 'reps_only'),
  ex('face_pull', 'Face Pull', 'cable', 'shoulders', ['traps', 'back']),
  ex('shrug_db', 'Shrug (Dumbbell)', 'dumbbell', 'traps'),
  // Shoulders
  ex('ohp_bb', 'Overhead Press (Barbell)', 'barbell', 'shoulders', ['triceps']),
  ex('ohp_db', 'Shoulder Press (Dumbbell)', 'dumbbell', 'shoulders', ['triceps']),
  ex('lateral_raise', 'Lateral Raise (Dumbbell)', 'dumbbell', 'shoulders'),
  ex('cable_lateral', 'Lateral Raise (Cable)', 'cable', 'shoulders'),
  ex('rear_delt_fly', 'Rear Delt Fly', 'dumbbell', 'shoulders', ['back']),
  // Arms
  ex('curl_bb', 'Bicep Curl (Barbell)', 'barbell', 'biceps', ['forearms']),
  ex('curl_db', 'Bicep Curl (Dumbbell)', 'dumbbell', 'biceps', ['forearms']),
  ex('hammer_curl', 'Hammer Curl', 'dumbbell', 'biceps', ['forearms']),
  ex('preacher_curl', 'Preacher Curl (Machine)', 'machine', 'biceps'),
  ex('pushdown', 'Triceps Pushdown', 'cable', 'triceps'),
  ex('skull_crusher', 'Skull Crusher', 'barbell', 'triceps'),
  ex('oh_tri_ext', 'Overhead Triceps Extension', 'cable', 'triceps'),
  ex('wrist_curl', 'Wrist Curl', 'dumbbell', 'forearms'),
  // Legs
  ex('squat_bb', 'Back Squat (Barbell)', 'barbell', 'quads', ['glutes', 'hamstrings']),
  ex('front_squat', 'Front Squat', 'barbell', 'quads', ['glutes', 'abs']),
  ex('leg_press', 'Leg Press', 'machine', 'quads', ['glutes']),
  ex('hack_squat', 'Hack Squat', 'machine', 'quads', ['glutes']),
  ex('split_squat', 'Bulgarian Split Squat', 'dumbbell', 'quads', ['glutes']),
  ex('lunge', 'Walking Lunge', 'dumbbell', 'quads', ['glutes']),
  ex('leg_ext', 'Leg Extension', 'machine', 'quads'),
  ex('rdl', 'Romanian Deadlift', 'barbell', 'hamstrings', ['glutes', 'back']),
  ex('leg_curl', 'Leg Curl (Machine)', 'machine', 'hamstrings'),
  ex('hip_thrust', 'Hip Thrust', 'barbell', 'glutes', ['hamstrings']),
  ex('calf_raise', 'Standing Calf Raise', 'machine', 'calves'),
  ex('seated_calf', 'Seated Calf Raise', 'machine', 'calves'),
  // Core
  ex('plank', 'Plank', 'bodyweight', 'abs', [], 'duration'),
  ex('hanging_leg_raise', 'Hanging Leg Raise', 'bodyweight', 'abs', [], 'reps_only'),
  ex('cable_crunch', 'Cable Crunch', 'cable', 'abs'),
  ex('ab_wheel', 'Ab Wheel', 'other', 'abs', [], 'reps_only'),
  // Cardio
  ex('row_erg', 'Rowing Machine', 'machine', 'cardio', ['back'], 'duration'),
  ex('bike', 'Stationary Bike', 'machine', 'cardio', ['quads'], 'duration'),
];

export const MUSCLE_LABEL: Record<Muscle, string> = {
  chest: 'Chest',
  back: 'Upper back',
  lats: 'Lats',
  traps: 'Traps',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  abs: 'Abs',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  cardio: 'Cardio',
};

export const MUSCLES = Object.keys(MUSCLE_LABEL) as Muscle[];

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  cable: 'Cable',
  bodyweight: 'Bodyweight',
  kettlebell: 'Kettlebell',
  band: 'Band',
  other: 'Other',
};
