import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../../src/components/icons';
import { NumberField } from '../../src/components/NumberField';
import { Button, IconButton, Label, Row, Stat } from '../../src/components/ui';
import { useNow } from '../../src/hooks';
import { fromDisplayWeight, toDisplayWeight } from '../../src/lib/calc';
import { clock, volume, weight } from '../../src/lib/format';
import { detectPRs, PR_LABEL, workoutSetCount, workoutVolumeKg, type PR } from '../../src/lib/stats';
import type { Exercise, SetType, WorkoutExercise, WorkoutSet } from '../../src/lib/types';
import { lookupExercise, previousForActive, useStore } from '../../src/store';
import * as ops from '../../src/store/ops';
import { c, radius, SET_TYPE_STYLE, space, type } from '../../src/theme';

const REST_PRESETS = [0, 30, 45, 60, 90, 120, 150, 180, 240, 300];
const RPE_VALUES = [6, 7, 7.5, 8, 8.5, 9, 9.5, 10];

function KeepAwake() {
  useKeepAwake();
  return null;
}

export default function LiveWorkout() {
  const insets = useSafeAreaInsets();
  const active = useStore((s) => s.active);
  const history = useStore((s) => s.history);
  const custom = useStore((s) => s.customExercises);
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateActive);
  const discard = useStore((s) => s.discardWorkout);
  const now = useNow(1000, !!active);

  const kindOf = (id: string) => lookupExercise({ customExercises: custom }, id)?.kind ?? 'weight_reps';
  const prs = useMemo(() => (active ? detectPRs(active, history, kindOf) : []), [active, history, custom]);
  const prBySet = useMemo(() => {
    const m = new Map<string, PR[]>();
    for (const p of prs) if (p.setId) m.set(p.setId, [...(m.get(p.setId) ?? []), p]);
    return m;
  }, [prs]);

  const supersetLetters = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of active?.exercises ?? []) {
      if (e.supersetId && !m.has(e.supersetId)) m.set(e.supersetId, String.fromCharCode(65 + m.size));
    }
    return m;
  }, [active]);

  if (!active) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <Text style={type.h3}>No workout in progress</Text>
        <Button title="Close" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      </View>
    );
  }

  const total = active.exercises.reduce((n, e) => n + e.sets.length, 0);
  const done = active.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  const latestPR = prs[prs.length - 1];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {settings.keepAwake ? <KeepAwake /> : null}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <IconButton name="down" label="Minimise workout" onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <TextInput
            value={active.name}
            onChangeText={(name) => update((w) => ({ ...w, name }))}
            accessibilityLabel="Workout name"
            style={[type.h3, { padding: 0 }]}
          />
          <Row style={{ gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.ember }} />
            <Label color={c.emberText}>Live</Label>
            <Label>· {clock((now - active.startedAt) / 1000)}</Label>
          </Row>
        </View>
        <Button small variant="primary" title="Finish" onPress={() => router.push('/workout/finish')} disabled={done === 0} />
      </View>

      <Row style={styles.statsRow}>
        <Stat label="Volume" value={volume(workoutVolumeKg(active), settings.unit)} />
        <Stat label="Sets" value={`${done} / ${total}`} />
        <Stat label="Working sets" value={String(workoutSetCount(active))} />
      </Row>

      <RestPanel />

      <ScrollView contentContainerStyle={{ padding: space[4], gap: space[4], paddingBottom: insets.bottom + 120 }} keyboardShouldPersistTaps="handled">
        {latestPR ? (
          <View style={styles.prBanner} accessibilityRole="alert">
            <Icon name="trophy" size={22} color={c.emberText} />
            <View style={{ flex: 1 }}>
              <Label color={c.emberText}>
                {prs.length} PR{prs.length === 1 ? '' : 's'} this workout · {PR_LABEL[latestPR.kind]}
              </Label>
              <Text style={type.bodySm}>{lookupExercise({ customExercises: custom }, latestPR.exerciseId)?.name}</Text>
            </View>
          </View>
        ) : null}

        {active.exercises.length === 0 ? (
          <View style={{ alignItems: 'center', gap: 8, paddingVertical: space[8] }}>
            <Text style={type.h3}>Add your first exercise</Text>
            <Text style={type.bodySm}>Sets you complete are timed and saved.</Text>
          </View>
        ) : null}

        {active.exercises.map((we, i) => {
          const ex = lookupExercise({ customExercises: custom }, we.exerciseId);
          const prev = previousForActive({ history, settings, active }, we);
          const nextSame = active.exercises[i + 1]?.supersetId === we.supersetId;
          const prevSame = i > 0 && active.exercises[i - 1].supersetId === we.supersetId;
          return (
            <ExerciseBlock
              key={we.id}
              we={we}
              ex={ex}
              prev={prev}
              prBySet={prBySet}
              superset={we.supersetId ? { letter: supersetLetters.get(we.supersetId) ?? '', first: !prevSame, last: !nextSame } : null}
              isFirst={i === 0}
              isLast={i === active.exercises.length - 1}
            />
          );
        })}

        <Button title="Add exercise" icon="plus" onPress={() => router.push('/exercise/picker?mode=workout')} />
        <Button
          title="Discard workout"
          variant="danger"
          onPress={() =>
            Alert.alert('Discard workout?', 'Nothing from this session will be saved.', [
              { text: 'Keep going', style: 'cancel' },
              {
                text: 'Discard',
                style: 'destructive',
                onPress: () => {
                  discard();
                  if (router.canGoBack()) router.back();
                },
              },
            ])
          }
        />
        <View style={styles.legend}>
          <Label>
            <Text style={{ color: c.info }}>W</Text> warm-up   <Text style={{ color: c.warn }}>D</Text> drop   <Text style={{ color: c.critical }}>F</Text> failure · tap a set number to change it
          </Label>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function RestPanel() {
  const rest = useStore((s) => s.rest);
  const adjust = useStore((s) => s.adjustRest);
  const stop = useStore((s) => s.stopRest);
  const now = useNow(250, !!rest);
  if (!rest) return null;
  const left = Math.max(0, (rest.endsAt - now) / 1000);
  const pct = Math.min(1, 1 - left / rest.totalSec);
  return (
    <View style={styles.rest} accessibilityLiveRegion="polite">
      <Row style={{ justifyContent: 'space-between' }}>
        <Label>Rest</Label>
        <Text style={[type.data, { fontSize: 22 }]} accessibilityLabel={`${Math.ceil(left)} seconds of rest left`}>
          {clock(Math.ceil(left))} <Text style={{ color: c.muted, fontSize: 13 }}>/ {clock(rest.totalSec)}</Text>
        </Text>
      </Row>
      <View style={{ height: 4, backgroundColor: c.sunken, borderRadius: 2 }}>
        <View style={{ width: `${pct * 100}%`, height: 4, backgroundColor: c.ember, borderRadius: 2 }} />
      </View>
      <Row>
        <Button small title="−15s" variant="subtle" style={{ flex: 1 }} onPress={() => adjust(-15)} accessibilityLabel="Subtract 15 seconds" />
        <Button small title="+15s" variant="subtle" style={{ flex: 1 }} onPress={() => adjust(15)} accessibilityLabel="Add 15 seconds" />
        <Button small title="Skip" style={{ flex: 1 }} onPress={stop} accessibilityLabel="Skip rest" />
      </Row>
    </View>
  );
}

function ExerciseBlock({
  we,
  ex,
  prev,
  prBySet,
  superset,
  isFirst,
  isLast,
}: {
  we: WorkoutExercise;
  ex: Exercise | undefined;
  prev: WorkoutSet[] | null;
  prBySet: Map<string, PR[]>;
  superset: { letter: string; first: boolean; last: boolean } | null;
  isFirst: boolean;
  isLast: boolean;
}) {
  const update = useStore((s) => s.updateActive);
  const settings = useStore((s) => s.settings);
  const [noteOpen, setNoteOpen] = useState(we.note.length > 0);
  const kind = ex?.kind ?? 'weight_reps';

  const menu = () =>
    Alert.alert(ex?.name ?? 'Exercise', undefined, [
      { text: noteOpen ? 'Hide note' : 'Add note', onPress: () => setNoteOpen((o) => !o) },
      ...(!isLast
        ? [{ text: superset && !superset.last ? 'Unlink superset below' : 'Superset with next', onPress: () => update((w) => ({ ...w, exercises: ops.toggleSupersetWithNext(w.exercises, we.id) })) }]
        : []),
      ...(!isFirst ? [{ text: 'Move up', onPress: () => update((w) => ops.moveExercise(w, we.id, -1)) }] : []),
      ...(!isLast ? [{ text: 'Move down', onPress: () => update((w) => ops.moveExercise(w, we.id, 1)) }] : []),
      {
        text: 'Remove exercise',
        style: 'destructive' as const,
        onPress: () => update((w) => ops.removeExercise(w, we.id)),
      },
      { text: 'Cancel', style: 'cancel' as const },
    ]);

  const cycleRest = () => {
    const i = REST_PRESETS.indexOf(we.restSec);
    const next = REST_PRESETS[(i + 1) % REST_PRESETS.length];
    update((w) => ops.updateExercise(w, we.id, { restSec: next }));
  };

  let workingNo = 0;
  const cols = kind === 'weight_reps' ? ['kg', 'reps'] : kind === 'reps_only' ? ['reps'] : ['sec'];

  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {superset ? (
        <View
          style={{
            width: 8,
            borderColor: c.info,
            borderLeftWidth: 1,
            borderTopWidth: superset.first ? 1 : 0,
            borderBottomWidth: superset.last ? 1 : 0,
            marginTop: superset.first ? 8 : 0,
            marginBottom: superset.last ? 8 : 0,
          }}
        />
      ) : null}
      <View style={{ flex: 1, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border, paddingBottom: 12 }}>
        {superset?.first ? <Label color={c.info}>Superset {superset.letter}</Label> : null}
        <Row style={{ gap: 0 }}>
          <Pressable accessibilityRole="link" onPress={() => router.push(`/exercise/${we.exerciseId}`)} style={{ flex: 1, minHeight: 36, justifyContent: 'center' }}>
            <Text style={[type.h3, { color: c.ink }]}>{ex?.name ?? 'Unknown exercise'}</Text>
          </Pressable>
          {kind === 'weight_reps' ? (
            <IconButton name="plates" label="Plate and warm-up calculator" color={c.muted} onPress={() => router.push(`/workout/plates?weId=${we.id}`)} />
          ) : null}
          <IconButton name="more" label="Exercise options" color={c.muted} onPress={menu} />
        </Row>

        {noteOpen ? (
          <TextInput
            value={we.note}
            onChangeText={(note) => update((w) => ops.updateExercise(w, we.id, { note }))}
            placeholder="Note for this exercise (saved with the workout)"
            placeholderTextColor={c.muted}
            multiline
            accessibilityLabel="Exercise note"
            style={styles.note}
          />
        ) : null}

        <Pressable accessibilityRole="button" accessibilityLabel={`Rest timer ${we.restSec ? clock(we.restSec) : 'off'}. Tap to change.`} onPress={cycleRest} style={{ alignSelf: 'flex-start', minHeight: 28, justifyContent: 'center' }}>
          <Row style={{ gap: 6 }}>
            <Icon name="timer" size={13} color={c.muted} />
            <Label>{superset && !superset.last ? 'Rest after round' : we.restSec ? `Rest ${clock(we.restSec)}` : 'Rest off'}</Label>
          </Row>
        </Pressable>

        <View style={styles.setRow}>
          <Label style={styles.cSet}>Set</Label>
          <Label style={styles.cPrev}>Previous</Label>
          {cols.map((col) => (
            <Label key={col} style={styles.cNum}>
              {col === 'kg' ? settings.unit : col}
            </Label>
          ))}
          {settings.rpeEnabled ? <Label style={styles.cRpe}>RPE</Label> : null}
          <View style={styles.cCheck} />
        </View>

        {we.sets.map((s, idx) => {
          if (s.type !== 'warmup') workingNo++;
          return (
            <SetRow
              key={s.id}
              we={we}
              s={s}
              number={workingNo}
              prev={prev?.[idx] ?? null}
              kind={kind}
              prs={prBySet.get(s.id)}
            />
          );
        })}

        <Button small variant="subtle" title="Add set" icon="plus" onPress={() => update((w) => ops.addSet(w, we.id))} />
      </View>
    </View>
  );
}

function SetRow({
  we,
  s,
  number,
  prev,
  kind,
  prs,
}: {
  we: WorkoutExercise;
  s: WorkoutSet;
  number: number;
  prev: WorkoutSet | null;
  kind: Exercise['kind'];
  prs?: PR[];
}) {
  const update = useStore((st) => st.updateActive);
  const toggle = useStore((st) => st.completeOrUndoSet);
  const settings = useStore((st) => st.settings);
  const unit = settings.unit;
  const label = s.type === 'normal' ? String(number) : SET_TYPE_STYLE[s.type].short;
  const setPatch = (patch: Partial<WorkoutSet>) => update((w) => ops.updateSet(w, we.id, s.id, patch));

  const prevText = !prev
    ? '—'
    : kind === 'weight_reps'
      ? `${weight(prev.weightKg, unit, false)} × ${prev.reps ?? '—'}`
      : kind === 'reps_only'
        ? `${prev.reps ?? '—'} reps`
        : `${prev.durationSec ?? '—'}s`;

  const typeMenu = () =>
    Alert.alert(`Set ${label}`, undefined, [
      ...(['normal', 'warmup', 'drop', 'failure'] as SetType[]).map((t) => ({
        text: { normal: 'Normal', warmup: 'Warm-up', drop: 'Drop set', failure: 'Failure' }[t] + (t === s.type ? ' ✓' : ''),
        onPress: () => setPatch({ type: t }),
      })),
      { text: 'Delete set', style: 'destructive' as const, onPress: () => update((w) => ops.removeSet(w, we.id, s.id)) },
      { text: 'Cancel', style: 'cancel' as const },
    ]);

  const rpeMenu = () =>
    Alert.alert('RPE', 'How hard was that set? 10 = nothing left.', [
      ...RPE_VALUES.map((v) => ({ text: String(v), onPress: () => setPatch({ rpe: v }) })),
      { text: 'Clear', onPress: () => setPatch({ rpe: null }) },
      { text: 'Cancel', style: 'cancel' as const },
    ]);

  const onCheck = () => {
    const { completed } = toggle(we.id, s.id);
    if (completed && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  return (
    <View style={[styles.setRow, { minHeight: 42, borderRadius: radius.sm }, prs?.length ? { backgroundColor: c.dawn } : null]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Set ${label}, ${s.type}. Change type or delete`} onPress={typeMenu} style={[styles.cSet, { minHeight: 40, justifyContent: 'center' }]}>
        <Row style={{ gap: 2 }}>
          <Text style={[type.data, { color: SET_TYPE_STYLE[s.type].color, fontWeight: '600' }]}>{label}</Text>
          {prs?.length ? <Icon name="trophy" size={12} color={c.emberText} /> : null}
        </Row>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Previous ${prevText}. Tap to copy.`}
        disabled={!prev}
        onPress={() => prev && setPatch({ weightKg: prev.weightKg, reps: prev.reps, durationSec: prev.durationSec })}
        style={[styles.cPrev, { minHeight: 40, justifyContent: 'center' }]}
      >
        <Text style={[type.data, { color: c.muted, fontSize: 13 }]} numberOfLines={1}>
          {prevText}
        </Text>
      </Pressable>
      {kind === 'weight_reps' ? (
        <NumberField
          style={styles.cNum}
          done={s.done}
          value={s.weightKg == null ? null : toDisplayWeight(s.weightKg, unit)}
          placeholder={prev?.weightKg != null ? String(toDisplayWeight(prev.weightKg, unit)) : unit}
          onCommit={(n) => setPatch({ weightKg: n == null ? null : fromDisplayWeight(n, unit) })}
          accessibilityLabel={`Weight in ${unit}`}
        />
      ) : null}
      {kind !== 'duration' ? (
        <NumberField
          style={styles.cNum}
          done={s.done}
          decimal={false}
          value={s.reps}
          placeholder={prev?.reps != null ? String(prev.reps) : 'reps'}
          onCommit={(n) => setPatch({ reps: n == null ? null : Math.round(n) })}
          accessibilityLabel="Reps"
        />
      ) : (
        <NumberField
          style={styles.cNum}
          done={s.done}
          decimal={false}
          value={s.durationSec}
          placeholder={prev?.durationSec != null ? String(prev.durationSec) : 'sec'}
          onCommit={(n) => setPatch({ durationSec: n == null ? null : Math.round(n) })}
          accessibilityLabel="Duration in seconds"
        />
      )}
      {settings.rpeEnabled ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`RPE ${s.rpe ?? 'not set'}`} onPress={rpeMenu} style={[styles.cRpe, { minHeight: 40, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={[type.data, { color: s.rpe ? c.ink2 : c.border }]}>{s.rpe ?? '·'}</Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: s.done }}
        accessibilityLabel={s.done ? 'Set done. Tap to undo' : 'Mark set done'}
        onPress={onCheck}
        style={[styles.cCheck, styles.check, s.done && { backgroundColor: c.ok, borderColor: c.ok }]}
      >
        <Icon name="check" size={16} color={s.done ? c.inkInverse : c.muted} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[2],
    paddingRight: space[4],
    paddingBottom: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  statsRow: { paddingHorizontal: space[4], paddingVertical: space[3], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  rest: {
    margin: space[4],
    marginBottom: 0,
    padding: space[3],
    gap: space[3],
    backgroundColor: c.surface,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  prBanner: { flexDirection: 'row', alignItems: 'center', gap: space[3], backgroundColor: c.dawn, borderRadius: radius.lg, padding: space[3] },
  note: {
    color: c.ink2,
    fontSize: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: c.border,
    borderRadius: radius.md,
    padding: space[2],
    minHeight: 40,
  },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cSet: { width: 34 },
  cPrev: { flex: 1 },
  cNum: { width: 60 },
  cRpe: { width: 36, textAlign: 'center' },
  cCheck: { width: 36 },
  check: { height: 34, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  legend: { paddingTop: space[2] },
});
