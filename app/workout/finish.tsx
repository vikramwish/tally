import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';

import { Icon } from '../../src/components/icons';
import { Button, Card, Label, Row, Screen, Stat, ToggleRow } from '../../src/components/ui';
import { duration, volume } from '../../src/lib/format';
import { detectPRs, PR_LABEL, workoutDurationSec, workoutSetCount, workoutVolumeKg } from '../../src/lib/stats';
import { lookupExercise, useStore } from '../../src/store';
import * as ops from '../../src/store/ops';
import { c, radius, space, type } from '../../src/theme';
import { formatPRValue } from '../../src/prFormat';

export default function Finish() {
  const active = useStore((s) => s.active);
  const history = useStore((s) => s.history);
  const custom = useStore((s) => s.customExercises);
  const routines = useStore((s) => s.routines);
  const unit = useStore((s) => s.settings.unit);
  const finish = useStore((s) => s.finishWorkout);
  const discard = useStore((s) => s.discardWorkout);

  const [name, setName] = useState(active?.name ?? '');
  const [notes, setNotes] = useState(active?.notes ?? '');
  const [updateRoutine, setUpdateRoutine] = useState(false);

  const preview = useMemo(() => (active ? ops.finalizeWorkout(active, Date.now()) : null), [active]);
  const prs = useMemo(
    () => (preview ? detectPRs(preview, history, (id) => lookupExercise({ customExercises: custom }, id)?.kind ?? 'weight_reps') : []),
    [preview, history, custom],
  );

  if (!active || !preview) {
    return (
      <Screen>
        <Text style={type.h3}>No workout in progress</Text>
      </Screen>
    );
  }

  const incomplete = ops.incompleteSetCount(active);
  const routine = routines.find((r) => r.id === active.routineId);

  const save = () => {
    const res = finish({ name, notes, updateRoutine });
    if (!res) return;
    router.dismissAll();
    router.push(`/history/${res.workout.id}`);
  };

  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <Label>Title</Label>
        <TextInput value={name} onChangeText={setName} accessibilityLabel="Workout title" style={input} />
      </View>

      <Card style={{ flexDirection: 'row' }}>
        <Stat label="Duration" value={duration(workoutDurationSec(preview))} />
        <Stat label="Volume" value={volume(workoutVolumeKg(preview), unit)} />
        <Stat label="Sets" value={String(workoutSetCount(preview))} />
        <Stat label="PRs" value={String(prs.length)} color={prs.length ? c.emberText : undefined} />
      </Card>

      {prs.length ? (
        <View style={{ backgroundColor: c.dawn, borderRadius: radius.lg, padding: space[4], gap: space[2] }}>
          <Row>
            <Icon name="trophy" size={18} color={c.emberText} />
            <Label color={c.emberText}>New personal records</Label>
          </Row>
          {prs.map((p, i) => (
            <Row key={i} style={{ justifyContent: 'space-between' }}>
              <Text style={[type.bodySm, { flex: 1 }]} numberOfLines={1}>
                {lookupExercise({ customExercises: custom }, p.exerciseId)?.name} · {PR_LABEL[p.kind]}
              </Text>
              <Text style={type.data}>{formatPRValue(p.kind, p.value, unit)}</Text>
            </Row>
          ))}
        </View>
      ) : null}

      <View style={{ gap: 6 }}>
        <Label>Notes</Label>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="How did it go?"
          placeholderTextColor={c.muted}
          accessibilityLabel="Workout notes"
          style={[input, { height: 96, paddingTop: 10, textAlignVertical: 'top' }]}
        />
      </View>

      {routine ? (
        <Card style={{ padding: 0 }}>
          <ToggleRow
            title={`Update “${routine.name}”`}
            detail="Save today's exercises, sets and weights as the new routine targets."
            value={updateRoutine}
            onChange={setUpdateRoutine}
            last
          />
        </Card>
      ) : null}

      {incomplete > 0 ? (
        <Text style={[type.bodySm, { color: c.warn }]}>
          {incomplete} unfinished set{incomplete === 1 ? '' : 's'} will not be saved.
        </Text>
      ) : null}

      <Button title="Save workout" variant="primary" onPress={save} disabled={preview.exercises.length === 0} />
      <Button
        title="Discard workout"
        variant="danger"
        onPress={() =>
          Alert.alert('Discard workout?', 'Nothing from this session will be saved.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Discard',
              style: 'destructive',
              onPress: () => {
                discard();
                router.dismissAll();
              },
            },
          ])
        }
      />
    </Screen>
  );
}

const input = {
  minHeight: 44,
  backgroundColor: c.sunken,
  borderColor: c.border,
  borderWidth: 1,
  borderRadius: radius.md,
  color: c.ink,
  paddingHorizontal: space[3],
  fontSize: 16,
} as const;
