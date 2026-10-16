import * as ops from '../ops';
import type { Settings, Workout } from '../../lib/types';

const settings = { defaultRestSec: 90 } as Settings;

function base(): Workout {
  let w = ops.emptyWorkout(1000, 'Test');
  w = ops.addExercises(w, ['bench_bb', 'cable_fly', 'pushdown'], [], settings);
  return w;
}

describe('workout ops', () => {
  it('adds exercises with one empty set and default rest', () => {
    const w = base();
    expect(w.exercises.map((e) => e.exerciseId)).toEqual(['bench_bb', 'cable_fly', 'pushdown']);
    expect(w.exercises.every((e) => e.sets.length === 1 && e.restSec === 90)).toBe(true);
  });

  it('fills empty inputs from previous values when a set is completed, and undoes', () => {
    let w = base();
    const e = w.exercises[0];
    w = ops.addSet(w, e.id);
    const prev = [
      { id: 'p1', type: 'normal' as const, weightKg: 100, reps: 5, durationSec: null, rpe: null, done: true },
      { id: 'p2', type: 'normal' as const, weightKg: 100, reps: 4, durationSec: null, rpe: null, done: true },
    ];
    const second = w.exercises[0].sets[1];
    w = ops.updateSet(w, e.id, second.id, { weightKg: 102.5 });
    const r = ops.toggleSetDone(w, e.id, second.id, prev);
    expect(r.completed).toBe(true);
    const s = r.workout.exercises[0].sets[1];
    expect([s.weightKg, s.reps, s.done]).toEqual([102.5, 4, true]);
    const u = ops.toggleSetDone(r.workout, e.id, second.id, prev);
    expect(u.completed).toBe(false);
    expect(u.workout.exercises[0].sets[1].done).toBe(false);
  });

  it('links and unlinks supersets and skips rest mid-superset', () => {
    let w = base();
    const [a, b, c] = w.exercises;
    w = { ...w, exercises: ops.toggleSupersetWithNext(w.exercises, a.id) };
    expect(w.exercises[0].supersetId).not.toBeNull();
    expect(w.exercises[0].supersetId).toBe(w.exercises[1].supersetId);
    expect(ops.restAfter(w, a.id)).toBe(0);
    expect(ops.restAfter(w, b.id)).toBe(90);
    // extend to the third
    w = { ...w, exercises: ops.toggleSupersetWithNext(w.exercises, b.id) };
    expect(w.exercises[2].supersetId).toBe(w.exercises[0].supersetId);
    expect(ops.restAfter(w, b.id)).toBe(0);
    // removing the middle one keeps the other two linked
    w = ops.removeExercise(w, b.id);
    expect(w.exercises[0].supersetId).toBe(w.exercises[1].supersetId);
    // unlink -> both cleared because a lone member is dissolved
    w = { ...w, exercises: ops.toggleSupersetWithNext(w.exercises, a.id) };
    expect(w.exercises.map((e) => e.supersetId)).toEqual([null, null]);
    expect(c.id).toBe(w.exercises[1].id);
  });

  it('moves exercises within bounds', () => {
    const w = base();
    const moved = ops.moveExercise(w, w.exercises[2].id, 1);
    expect(moved).toBe(w);
    expect(ops.moveExercise(w, w.exercises[2].id, -1).exercises.map((e) => e.exerciseId)).toEqual(['bench_bb', 'pushdown', 'cable_fly']);
  });

  it('cycles set types', () => {
    expect(ops.nextSetType('normal')).toBe('warmup');
    expect(ops.nextSetType('failure')).toBe('normal');
  });

  it('inserts warm-ups first and finalizes by dropping unfinished work', () => {
    let w = base();
    const e = w.exercises[0];
    w = ops.insertWarmups(w, e.id, [{ weightKg: 40, reps: 10 }, { weightKg: 60, reps: 5 }]);
    expect(w.exercises[0].sets.map((s) => s.type)).toEqual(['warmup', 'warmup', 'normal']);
    w = ops.toggleSetDone(w, e.id, w.exercises[0].sets[0].id, null).workout;
    expect(ops.incompleteSetCount(w)).toBe(4);
    const f = ops.finalizeWorkout(w, 5000);
    expect(f.endedAt).toBe(5000);
    expect(f.exercises.length).toBe(1);
    expect(f.exercises[0].sets.length).toBe(1);
  });

  it('round-trips a workout through a routine', () => {
    let w = base();
    w = ops.updateSet(w, w.exercises[0].id, w.exercises[0].sets[0].id, { weightKg: 80, reps: 8 });
    const r = ops.routineFromWorkout(w, 'Push', null, 1);
    const w2 = ops.workoutFromRoutine(r, 2);
    expect(w2.routineId).toBe(r.id);
    expect(w2.name).toBe('Push');
    expect(w2.exercises[0].sets[0]).toMatchObject({ weightKg: 80, reps: 8, done: false });
    expect(w2.exercises[0].id).not.toBe(w.exercises[0].id);
  });
});
