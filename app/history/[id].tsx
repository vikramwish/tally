import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, Share, Text, View } from 'react-native';

import { Icon } from '../../src/components/icons';
import { Button, Card, Label, Row, Screen, Stat } from '../../src/components/ui';
import { clock, duration, shortDate, volume, weight } from '../../src/lib/format';
import { detectPRs, PR_LABEL, workoutDurationSec, workoutSetCount, workoutVolumeKg } from '../../src/lib/stats';
import type { Workout } from '../../src/lib/types';
import { lookupExercise, useStore } from '../../src/store';
import { formatPRValue } from '../../src/prFormat';
import { c, SET_TYPE_STYLE, space, type } from '../../src/theme';

export default function WorkoutDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const history = useStore((s) => s.history);
  const custom = useStore((s) => s.customExercises);
  const unit = useStore((s) => s.settings.unit);
  const del = useStore((s) => s.deleteWorkout);
  const saveAsRoutine = useStore((s) => s.saveWorkoutAsRoutine);
  const w = history.find((x) => x.id === id);

  const kindOf = (eid: string) => lookupExercise({ customExercises: custom }, eid)?.kind ?? 'weight_reps';
  const prs = useMemo(() => (w ? detectPRs(w, history, kindOf) : []), [w, history, custom]);
  const prSets = new Set(prs.map((p) => p.setId).filter(Boolean));

  if (!w) {
    return (
      <Screen>
        <Text style={type.h3}>Workout not found</Text>
      </Screen>
    );
  }

  const name = (eid: string) => lookupExercise({ customExercises: custom }, eid)?.name ?? 'Unknown exercise';

  return (
    <Screen>
      <Stack.Screen options={{ title: shortDate(w.startedAt) }} />
      <View style={{ gap: 4 }}>
        <Text style={type.h2}>{w.name}</Text>
        <Label>
          {new Date(w.startedAt).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} ·{' '}
          {new Date(w.startedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
        </Label>
      </View>

      <Card style={{ flexDirection: 'row' }}>
        <Stat label="Duration" value={duration(workoutDurationSec(w))} />
        <Stat label="Volume" value={volume(workoutVolumeKg(w), unit)} />
        <Stat label="Sets" value={String(workoutSetCount(w))} />
        <Stat label="PRs" value={String(prs.length)} color={prs.length ? c.emberText : undefined} />
      </Card>

      {w.notes ? <Text style={type.bodySm}>{w.notes}</Text> : null}

      {prs.length ? (
        <View style={{ backgroundColor: c.dawn, borderRadius: 8, padding: space[4], gap: 6 }}>
          <Row>
            <Icon name="trophy" size={16} color={c.emberText} />
            <Label color={c.emberText}>Personal records</Label>
          </Row>
          {prs.map((p, i) => (
            <Row key={i} style={{ justifyContent: 'space-between' }}>
              <Text style={[type.bodySm, { flex: 1 }]} numberOfLines={1}>
                {name(p.exerciseId)} · {PR_LABEL[p.kind]}
              </Text>
              <Text style={type.data}>{formatPRValue(p.kind, p.value, unit)}</Text>
            </Row>
          ))}
        </View>
      ) : null}

      {w.exercises.map((e) => {
        const kind = kindOf(e.exerciseId);
        let n = 0;
        return (
          <Card key={e.id} style={{ gap: 6 }}>
            <Pressable accessibilityRole="link" onPress={() => router.push(`/exercise/${e.exerciseId}`)}>
              <Text style={type.h3}>{name(e.exerciseId)}</Text>
            </Pressable>
            {e.note ? <Text style={[type.bodySm, { color: c.muted }]}>{e.note}</Text> : null}
            {e.sets.map((s) => {
              if (s.type !== 'warmup') n++;
              const label = s.type === 'normal' ? String(n) : SET_TYPE_STYLE[s.type].short;
              return (
                <Row key={s.id} style={{ minHeight: 26 }}>
                  <Text style={[type.data, { width: 28, color: SET_TYPE_STYLE[s.type].color }]}>{label}</Text>
                  <Text style={[type.data, { flex: 1, color: s.type === 'warmup' ? c.muted : c.ink2 }]}>
                    {kind === 'weight_reps' ? `${weight(s.weightKg, unit)} × ${s.reps ?? '—'}` : kind === 'reps_only' ? `${s.reps ?? '—'} reps` : clock(s.durationSec ?? 0)}
                    {s.rpe ? `  @ RPE ${s.rpe}` : ''}
                  </Text>
                  {prSets.has(s.id) ? <Icon name="trophy" size={14} color={c.emberText} /> : null}
                </Row>
              );
            })}
          </Card>
        );
      })}

      <Row>
        <Button title="Share" icon="share" style={{ flex: 1 }} onPress={() => Share.share({ message: shareText(w, name, unit, prs.length) })} />
        <Button
          title="Save as routine"
          style={{ flex: 1 }}
          onPress={() => {
            const r = saveAsRoutine(w.id, w.name);
            if (r) Alert.alert('Routine saved', `“${r.name}” is in your Workout tab.`);
          }}
        />
      </Row>
      <Button
        title="Delete workout"
        variant="danger"
        onPress={() =>
          Alert.alert('Delete this workout?', 'Its sets will no longer count toward stats or records.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => {
                router.back();
                del(w.id);
              },
            },
          ])
        }
      />
    </Screen>
  );
}

function shareText(w: Workout, name: (id: string) => string, unit: 'kg' | 'lb', prs: number): string {
  const lines = [
    `${w.name} — ${shortDate(w.startedAt)}`,
    `${duration(workoutDurationSec(w))} · ${volume(workoutVolumeKg(w), unit)} · ${workoutSetCount(w)} sets${prs ? ` · ${prs} PR${prs === 1 ? '' : 's'}` : ''}`,
    '',
    ...w.exercises.map((e) => {
      const best = e.sets.filter((s) => s.type !== 'warmup').sort((a, b) => (b.weightKg ?? 0) - (a.weightKg ?? 0))[0];
      return `${name(e.exerciseId)}: ${e.sets.length} sets${best?.weightKg ? `, top ${weight(best.weightKg, unit)} × ${best.reps ?? '—'}` : ''}`;
    }),
  ];
  return lines.join('\n');
}
