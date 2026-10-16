import { router } from 'expo-router';
import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { WeekStrip } from '../../src/components/charts';
import { Button, Card, Empty, Label, Row, Screen } from '../../src/components/ui';
import { ActiveWorkoutBanner, WorkoutCard } from '../../src/components/WorkoutBits';
import { useNow } from '../../src/hooks';
import { prsInRange, weekDays, weeklyStreak } from '../../src/lib/stats';
import { lookupExercise, useStore } from '../../src/store';
import { c, type } from '../../src/theme';

export default function Home() {
  const history = useStore((s) => s.history);
  const custom = useStore((s) => s.customExercises);
  const goal = useStore((s) => s.settings.weeklyGoal);
  const active = useStore((s) => s.active);
  const startEmpty = useStore((s) => s.startEmptyWorkout);
  const now = useNow(60_000);

  const days = useMemo(() => weekDays(history, now), [history, now]);
  const streak = useMemo(() => weeklyStreak(history, now), [history, now]);
  const prCounts = useMemo(() => {
    const m = new Map<string, number>();
    const kindOf = (id: string) => lookupExercise({ customExercises: custom }, id)?.kind ?? 'weight_reps';
    for (const pr of prsInRange(history, 0, Number.MAX_SAFE_INTEGER, kindOf)) {
      m.set(pr.workoutId, (m.get(pr.workoutId) ?? 0) + 1);
    }
    return m;
  }, [history, custom]);

  const sorted = useMemo(() => [...history].sort((a, b) => b.startedAt - a.startedAt), [history]);
  const thisWeek = days.filter(Boolean).length;
  const todayIndex = (new Date(now).getDay() + 6) % 7;

  return (
    <Screen>
      <ActiveWorkoutBanner />
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Label>Streak · {String(streak).padStart(2, '0')} {streak === 1 ? 'week' : 'weeks'}</Label>
          <Label color={thisWeek >= goal ? c.ok : c.emberText}>
            {thisWeek} / {goal} this week
          </Label>
        </Row>
        <WeekStrip days={days} todayIndex={todayIndex} />
      </Card>

      {!active ? (
        <Button
          title="Start empty workout"
          icon="plus"
          variant="primary"
          onPress={() => {
            startEmpty();
            router.push('/workout/live');
          }}
        />
      ) : null}

      <Label style={{ marginTop: 8 }}>History · {history.length}</Label>
      {sorted.length === 0 ? (
        <Empty title="No workouts yet" body="Start an empty workout or build a routine. Everything you log shows up here." />
      ) : (
        <View style={{ gap: 12 }}>
          {sorted.map((w) => (
            <WorkoutCard key={w.id} workout={w} prCount={prCounts.get(w.id) ?? 0} />
          ))}
        </View>
      )}
      {sorted.length > 0 ? <Text style={[type.bodySm, { color: c.muted, textAlign: 'center' }]}>That's everything.</Text> : null}
    </Screen>
  );
}
