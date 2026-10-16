import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { NumberField } from '../../src/components/NumberField';
import { Button, Card, Label, Row, Screen } from '../../src/components/ui';
import { calcPlates, clean, fromDisplayWeight, toDisplayWeight, warmupSets } from '../../src/lib/calc';
import { num } from '../../src/lib/format';
import { lookupExercise, useStore } from '../../src/store';
import * as ops from '../../src/store/ops';
import { c, radius, space, type } from '../../src/theme';

const LB_PLATES = [45, 35, 25, 10, 5, 2.5];
const PLATE_LOOK: Array<[number, number, string]> = [
  // [min plate size in kg-equivalent, height, color]
  [20, 120, c.critical],
  [15, 110, c.info],
  [10, 96, c.warn],
  [5, 80, c.ok],
  [2.5, 64, c.ink],
  [0, 48, c.muted],
];

export default function Plates() {
  const { weId } = useLocalSearchParams<{ weId?: string }>();
  const active = useStore((s) => s.active);
  const settings = useStore((s) => s.settings);
  const custom = useStore((s) => s.customExercises);
  const update = useStore((s) => s.updateActive);
  const unit = settings.unit;

  const we = active?.exercises.find((e) => e.id === weId);
  const heaviestKg = Math.max(0, ...(we?.sets.filter((s) => s.type !== 'warmup').map((s) => s.weightKg ?? 0) ?? [0]));

  const bar = unit === 'kg' ? settings.barWeightKg : 45;
  const plates = unit === 'kg' ? settings.platesKg : LB_PLATES;
  const step = unit === 'kg' ? 2.5 : 5;
  const [target, setTarget] = useState<number>(() =>
    heaviestKg > 0 ? toDisplayWeight(heaviestKg, unit) : unit === 'kg' ? 60 : 135,
  );

  const res = calcPlates(target, bar, plates);
  const warm = warmupSets(target, bar, step);
  const counts = new Map<number, number>();
  res.perSide.forEach((p) => counts.set(p, (counts.get(p) ?? 0) + 1));
  const toKgEq = (p: number) => (unit === 'kg' ? p : p * 0.4536);
  const look = (p: number) => PLATE_LOOK.find(([min]) => toKgEq(p) >= min) ?? PLATE_LOOK[PLATE_LOOK.length - 1];

  const plateViews = (side: number[]) =>
    side.map((p, i) => {
      const [, h, col] = look(p);
      return <View key={i} style={{ width: Math.max(6, Math.min(20, toKgEq(p) * 0.8)), height: h, backgroundColor: col, borderRadius: radius.sm, borderWidth: 1, borderColor: c.bg }} />;
    });

  return (
    <Screen>
      {we ? <Label>{lookupExercise({ customExercises: custom }, we.exerciseId)?.name}</Label> : null}
      <Row style={{ borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: 4 }}>
        <Button small variant="subtle" title={`−${step}`} onPress={() => setTarget((t) => Math.max(bar, clean(t - step)))} accessibilityLabel={`Decrease ${step} ${unit}`} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Label style={{ fontSize: 10 }}>Target · {unit}</Label>
          <NumberField value={target} onCommit={(n) => n != null && setTarget(n)} accessibilityLabel={`Target weight in ${unit}`} style={{ fontSize: 26, height: 40, width: 120, backgroundColor: 'transparent' }} />
        </View>
        <Button small variant="subtle" title={`+${step}`} onPress={() => setTarget((t) => clean(t + step))} accessibilityLabel={`Increase ${step} ${unit}`} />
      </Row>

      <View
        accessible
        accessibilityLabel={`Bar loaded to ${num(res.loadedKg)} ${unit}. Per side: ${[...counts].map(([p, n]) => `${n} times ${p}`).join(', ') || 'nothing'}`}
        style={{ height: 160, backgroundColor: c.sunken, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 2 }}
      >
        {plateViews([...res.perSide].reverse())}
        <View style={{ width: 6, height: 28, backgroundColor: c.muted }} />
        <View style={{ width: 90, height: 6, backgroundColor: c.ink2 }} />
        <View style={{ width: 6, height: 28, backgroundColor: c.muted }} />
        {plateViews(res.perSide)}
      </View>

      <Card>
        <Label>Per side · bar {num(bar)} {unit}</Label>
        <Row style={{ flexWrap: 'wrap' }}>
          {counts.size === 0 ? <Text style={type.data}>Empty bar</Text> : null}
          {[...counts].map(([p, n]) => (
            <View key={p} style={{ borderWidth: 1, borderColor: c.border, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={type.data}>
                {n} × {num(p, 2)}
              </Text>
            </View>
          ))}
        </Row>
        {res.shortByKg > 0 ? (
          <Text style={[type.bodySm, { color: c.warn }]}>
            Closest load is {num(res.loadedKg, 2)} {unit} ({num(res.shortByKg, 2)} {unit} short) with your plates.
          </Text>
        ) : null}
      </Card>

      <Card style={{ gap: 0, padding: 0 }}>
        <View style={{ padding: space[4], paddingBottom: space[2] }}>
          <Label>Warm-up to {num(target, 2)} {unit}</Label>
        </View>
        {warm.length === 0 ? <Text style={[type.bodySm, { padding: space[4], paddingTop: 0 }]}>No warm-up needed at this weight.</Text> : null}
        {warm.map((w, i) => (
          <Row key={i} style={{ paddingHorizontal: space[4], minHeight: 40, borderTopWidth: 1, borderTopColor: c.border }}>
            <Text style={[type.data, { color: c.info, width: 32 }]}>W</Text>
            <Text style={[type.data, { color: c.muted, width: 56 }]}>{Math.round(w.pct * 100)}%</Text>
            <Text style={[type.data, { flex: 1 }]}>
              {num(w.weightKg, 2)} {unit}
            </Text>
            <Text style={type.data}>× {w.reps}</Text>
          </Row>
        ))}
      </Card>

      {we && warm.length ? (
        <Button
          title={`Add ${warm.length} warm-up sets`}
          variant="primary"
          onPress={() => {
            update((w) => ops.insertWarmups(w, we.id, warm.map((s) => ({ weightKg: fromDisplayWeight(s.weightKg, unit), reps: s.reps }))));
            router.back();
          }}
        />
      ) : null}
      <Button title="Done" onPress={() => router.back()} />
    </Screen>
  );
}
