import { router, Stack } from 'expo-router';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import { Icon } from '../../src/components/icons';
import { NumberField } from '../../src/components/NumberField';
import { Button, Chip, IconButton, Label, Row, Screen } from '../../src/components/ui';
import { fromDisplayWeight, toDisplayWeight } from '../../src/lib/calc';
import { clock } from '../../src/lib/format';
import type { Routine, RoutineExercise, RoutineSet, SetType } from '../../src/lib/types';
import { lookupExercise, useStore } from '../../src/store';
import * as ops from '../../src/store/ops';
import { c, radius, SET_TYPE_STYLE, space, type } from '../../src/theme';

const REST_PRESETS = [0, 30, 45, 60, 90, 120, 150, 180, 240, 300];

function mapEx(r: Routine, id: string, fn: (e: RoutineExercise) => RoutineExercise): Routine {
  return { ...r, exercises: r.exercises.map((e) => (e.id === id ? fn(e) : e)) };
}

export default function EditRoutine() {
  const draft = useStore((s) => s.routineDraft);
  const folders = useStore((s) => s.folders);
  const update = useStore((s) => s.updateDraft);
  const save = useStore((s) => s.saveDraft);
  const cancel = useStore((s) => s.cancelDraft);
  const isNew = useStore((s) => !s.routines.some((r) => r.id === s.routineDraft?.id));

  const close = () => {
    cancel();
    router.back();
  };

  if (!draft) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Routine' }} />
        <Text style={type.h3}>Nothing to edit</Text>
        <Button title="Close" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: isNew ? 'New routine' : 'Edit routine',
          headerLeft: () => (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                Alert.alert('Discard changes?', undefined, [
                  { text: 'Keep editing', style: 'cancel' },
                  { text: 'Discard', style: 'destructive', onPress: close },
                ])
              }
              hitSlop={10}
            >
              <Text style={[type.button, { color: c.ink2 }]}>Cancel</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                save();
                router.back();
              }}
              hitSlop={10}
            >
              <Text style={[type.button, { color: c.emberText }]}>Save</Text>
            </Pressable>
          ),
        }}
      />

      <View style={{ gap: 6 }}>
        <Label>Routine name</Label>
        <TextInput
          value={draft.name}
          onChangeText={(name) => update((r) => ({ ...r, name }))}
          placeholder="e.g. Push A"
          placeholderTextColor={c.muted}
          accessibilityLabel="Routine name"
          style={{ height: 48, backgroundColor: c.sunken, borderColor: c.border, borderWidth: 1, borderRadius: radius.md, color: c.ink, paddingHorizontal: space[3], fontSize: 18, fontWeight: '600' }}
        />
      </View>

      {folders.length ? (
        <View style={{ gap: 6 }}>
          <Label>Folder</Label>
          <Row style={{ flexWrap: 'wrap', gap: 6 }}>
            <Chip label="None" selected={!draft.folderId} onPress={() => update((r) => ({ ...r, folderId: null }))} />
            {folders.map((f) => (
              <Chip key={f.id} label={f.name} selected={draft.folderId === f.id} onPress={() => update((r) => ({ ...r, folderId: f.id }))} />
            ))}
          </Row>
        </View>
      ) : null}

      {draft.exercises.map((e, i) => (
        <RoutineExerciseBlock key={e.id} e={e} index={i} count={draft.exercises.length} draft={draft} />
      ))}

      <Button title="Add exercises" icon="plus" onPress={() => router.push('/exercise/picker?mode=routine')} />
      <Text style={[type.bodySm, { color: c.muted }]}>Weights and reps are targets. Leave them empty to use what you did last time.</Text>
    </Screen>
  );
}

function RoutineExerciseBlock({ e, index, count, draft }: { e: RoutineExercise; index: number; count: number; draft: Routine }) {
  const custom = useStore((s) => s.customExercises);
  const unit = useStore((s) => s.settings.unit);
  const update = useStore((s) => s.updateDraft);
  const ex = lookupExercise({ customExercises: custom }, e.exerciseId);
  const kind = ex?.kind ?? 'weight_reps';
  const next = draft.exercises[index + 1];
  const linkedBelow = !!e.supersetId && next?.supersetId === e.supersetId;
  const linkedAbove = index > 0 && !!e.supersetId && draft.exercises[index - 1].supersetId === e.supersetId;

  const setPatch = (si: number, patch: Partial<RoutineSet>) =>
    update((r) => mapEx(r, e.id, (x) => ({ ...x, sets: x.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) })));

  const menu = () =>
    Alert.alert(ex?.name ?? 'Exercise', undefined, [
      ...(index < count - 1
        ? [{ text: linkedBelow ? 'Unlink superset below' : 'Superset with next', onPress: () => update((r) => ({ ...r, exercises: ops.toggleSupersetWithNext(r.exercises, e.id) })) }]
        : []),
      ...(index > 0
        ? [{ text: 'Move up', onPress: () => update((r) => ({ ...r, exercises: swap(r.exercises, index, index - 1) })) }]
        : []),
      ...(index < count - 1
        ? [{ text: 'Move down', onPress: () => update((r) => ({ ...r, exercises: swap(r.exercises, index, index + 1) })) }]
        : []),
      {
        text: 'Remove',
        style: 'destructive' as const,
        onPress: () =>
          update((r) => ({
            ...r,
            exercises: ops.dissolveLonelySupersets(r.exercises.filter((x) => x.id !== e.id)),
          })),
      },
      { text: 'Cancel', style: 'cancel' as const },
    ]);

  let n = 0;
  return (
    <View style={{ gap: 8, paddingLeft: e.supersetId ? 10 : 0, borderLeftWidth: e.supersetId ? 1 : 0, borderLeftColor: c.info, borderBottomWidth: 1, borderBottomColor: c.border, paddingBottom: 12 }}>
      {e.supersetId && !linkedAbove ? <Label color={c.info}>Superset</Label> : null}
      <Row style={{ gap: 0 }}>
        <Text style={[type.h3, { flex: 1 }]}>{ex?.name ?? 'Unknown exercise'}</Text>
        <IconButton name="more" label="Exercise options" color={c.muted} onPress={menu} />
      </Row>
      <TextInput
        value={e.note}
        onChangeText={(note) => update((r) => mapEx(r, e.id, (x) => ({ ...x, note })))}
        placeholder="Add a note (cues, setup, tempo)"
        placeholderTextColor={c.muted}
        accessibilityLabel="Exercise note"
        style={{ color: c.ink2, fontSize: 14, minHeight: 32 }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Rest ${e.restSec ? clock(e.restSec) : 'off'}. Tap to change.`}
        onPress={() => update((r) => mapEx(r, e.id, (x) => ({ ...x, restSec: REST_PRESETS[(REST_PRESETS.indexOf(x.restSec) + 1) % REST_PRESETS.length] })))}
        style={{ alignSelf: 'flex-start', minHeight: 28, justifyContent: 'center' }}
      >
        <Row style={{ gap: 6 }}>
          <Icon name="timer" size={13} color={c.muted} />
          <Label>{e.restSec ? `Rest ${clock(e.restSec)}` : 'Rest off'}</Label>
        </Row>
      </Pressable>

      <Row>
        <Label style={{ width: 40 }}>Set</Label>
        {kind === 'weight_reps' ? <Label style={{ flex: 1 }}>{unit}</Label> : null}
        <Label style={{ flex: 1 }}>{kind === 'duration' ? 'sec' : 'reps'}</Label>
      </Row>
      {e.sets.map((s, si) => {
        if (s.type !== 'warmup') n++;
        const label = s.type === 'normal' ? String(n) : SET_TYPE_STYLE[s.type].short;
        return (
          <Row key={si}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Set ${label}. Change type or delete`}
              style={{ width: 40, minHeight: 40, justifyContent: 'center' }}
              onPress={() =>
                Alert.alert(`Set ${label}`, undefined, [
                  ...(['normal', 'warmup', 'drop', 'failure'] as SetType[]).map((t) => ({
                    text: { normal: 'Normal', warmup: 'Warm-up', drop: 'Drop set', failure: 'Failure' }[t],
                    onPress: () => setPatch(si, { type: t }),
                  })),
                  {
                    text: 'Delete set',
                    style: 'destructive' as const,
                    onPress: () => update((r) => mapEx(r, e.id, (x) => ({ ...x, sets: x.sets.filter((_, j) => j !== si) }))),
                  },
                  { text: 'Cancel', style: 'cancel' as const },
                ])
              }
            >
              <Text style={[type.data, { color: SET_TYPE_STYLE[s.type].color, fontWeight: '600' }]}>{label}</Text>
            </Pressable>
            {kind === 'weight_reps' ? (
              <NumberField
                style={{ flex: 1 }}
                value={s.weightKg == null ? null : toDisplayWeight(s.weightKg, unit)}
                placeholder="—"
                onCommit={(v) => setPatch(si, { weightKg: v == null ? null : fromDisplayWeight(v, unit) })}
                accessibilityLabel={`Target weight, set ${label}`}
              />
            ) : null}
            {kind === 'duration' ? (
              <NumberField style={{ flex: 1 }} decimal={false} value={s.durationSec} placeholder="—" onCommit={(v) => setPatch(si, { durationSec: v })} accessibilityLabel={`Target seconds, set ${label}`} />
            ) : (
              <NumberField style={{ flex: 1 }} decimal={false} value={s.reps} placeholder="—" onCommit={(v) => setPatch(si, { reps: v == null ? null : Math.round(v) })} accessibilityLabel={`Target reps, set ${label}`} />
            )}
          </Row>
        );
      })}
      <Button
        small
        variant="subtle"
        title="Add set"
        icon="plus"
        onPress={() =>
          update((r) =>
            mapEx(r, e.id, (x) => {
              const last = x.sets[x.sets.length - 1];
              return { ...x, sets: [...x.sets, last ? { ...last, type: last.type === 'warmup' ? 'normal' : last.type } : { type: 'normal', weightKg: null, reps: null, durationSec: null }] };
            }),
          )
        }
      />
    </View>
  );
}

function swap<T>(list: T[], i: number, j: number): T[] {
  const out = [...list];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}
