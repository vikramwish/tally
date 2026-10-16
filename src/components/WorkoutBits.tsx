import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { clock, duration, relativeDay, volume } from '../lib/format';
import { workoutDurationSec, workoutSetCount, workoutVolumeKg } from '../lib/stats';
import type { Workout } from '../lib/types';
import { useNow } from '../hooks';
import { exerciseName, useStore } from '../store';
import { c, radius, space, type } from '../theme';
import { Icon } from './icons';
import { Card, Label, Row, Stat } from './ui';

/** Shown on tab screens while a workout is in progress. */
export function ActiveWorkoutBanner() {
  const active = useStore((s) => s.active);
  const now = useNow(1000, !!active);
  if (!active) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Resume ${active.name}`}
      onPress={() => router.push('/workout/live')}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
        backgroundColor: c.dawn,
        borderRadius: radius.lg,
        padding: space[3],
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.ember }} />
      <View style={{ flex: 1 }}>
        <Label color={c.emberText}>In progress · {clock((now - active.startedAt) / 1000)}</Label>
        <Text style={[type.body, { fontWeight: '500' }]} numberOfLines={1}>
          {active.name}
        </Text>
      </View>
      <Text style={[type.button, { color: c.emberText }]}>Resume</Text>
      <Icon name="right" size={16} color={c.emberText} />
    </Pressable>
  );
}

export function WorkoutCard({ workout, prCount }: { workout: Workout; prCount?: number }) {
  const unit = useStore((s) => s.settings.unit);
  const custom = useStore((s) => s.customExercises);
  const lines = workout.exercises.slice(0, 4);
  return (
    <Card onPress={() => router.push(`/history/${workout.id}`)} accessibilityLabel={`${workout.name}, ${relativeDay(workout.startedAt)}`}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={type.h3} numberOfLines={1}>
          {workout.name}
        </Text>
        <Label>{relativeDay(workout.startedAt)}</Label>
      </Row>
      <Row>
        <Stat label="Time" value={duration(workoutDurationSec(workout))} />
        <Stat label="Volume" value={volume(workoutVolumeKg(workout), unit)} />
        <Stat label="Sets" value={String(workoutSetCount(workout))} />
        {prCount != null ? <Stat label="PRs" value={String(prCount)} color={prCount ? c.emberText : undefined} /> : null}
      </Row>
      <View style={{ gap: 4 }}>
        {lines.map((e) => (
          <Row key={e.id} style={{ justifyContent: 'space-between' }}>
            <Text style={type.bodySm} numberOfLines={1}>
              {exerciseName({ customExercises: custom }, e.exerciseId)}
            </Text>
            <Text style={[type.data, { color: c.muted, fontSize: 13 }]}>{e.sets.length} sets</Text>
          </Row>
        ))}
        {workout.exercises.length > lines.length ? (
          <Label>+ {workout.exercises.length - lines.length} more</Label>
        ) : null}
      </View>
    </Card>
  );
}
