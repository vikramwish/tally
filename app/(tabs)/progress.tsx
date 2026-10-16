import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { BandBar, ConsistencyGrid, LineChart } from '../../src/components/charts';
import { Button, Card, Empty, IconButton, Label, ListRow, Row, Screen, Segmented } from '../../src/components/ui';
import { toDisplayWeight } from '../../src/lib/calc';
import { duration, monthName, num, relativeDay, volume, weight } from '../../src/lib/format';
import { MUSCLE_LABEL, MUSCLES } from '../../src/lib/exercises';
import type { Muscle } from '../../src/lib/types';
import {
  addDays,
  addMonths,
  consistencyGrid,
  prsInRange,
  PR_LABEL,
  setsPerMuscle,
  startOfMonth,
  startOfWeek,
  summarize,
} from '../../src/lib/stats';
import { useNow } from '../../src/hooks';
import { formatPRValue } from '../../src/prFormat';
import { lookupExercise, useStore } from '../../src/store';
import { c, type } from '../../src/theme';

type Range = '1M' | '3M' | '1Y' | 'ALL';
const RANGE_OPTIONS: Array<{ value: Range; label: string }> = [
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: '1Y', label: '1Y' },
  { value: 'ALL', label: 'All' },
];
const TARGET_MIN = 10;
const TARGET_MAX = 20;

export default function Progress() {
  const history = useStore((s) => s.history);
  const custom = useStore((s) => s.customExercises);
  const unit = useStore((s) => s.settings.unit);
  const measurements = useStore((s) => s.measurements);
  const now = useNow(60_000);
  const [range, setRange] = useState<Range>('3M');
  const [monthOffset, setMonthOffset] = useState(0);

  const lookup = (id: string) => lookupExercise({ customExercises: custom }, id);
  const kindOf = (id: string) => lookup(id)?.kind ?? 'weight_reps';

  const rangeFrom = useMemo(() => {
    const d = new Date(now);
    if (range === '1M') d.setMonth(d.getMonth() - 1);
    else if (range === '3M') d.setMonth(d.getMonth() - 3);
    else if (range === '1Y') d.setFullYear(d.getFullYear() - 1);
    else return 0;
    return d.getTime();
  }, [range, now]);

  const monthStart = addMonths(startOfMonth(now), monthOffset);
  const monthEnd = addMonths(monthStart, 1);
  const month = useMemo(() => summarize(history, monthStart, monthEnd), [history, monthStart, monthEnd]);
  const monthPRs = useMemo(() => prsInRange(history, monthStart, monthEnd, kindOf), [history, monthStart, monthEnd, custom]);
  const prevMonth = useMemo(() => summarize(history, addMonths(monthStart, -1), monthStart), [history, monthStart]);

  const grid = useMemo(() => consistencyGrid(history, 12, now), [history, now]);
  const weekStart = startOfWeek(now);
  const weekSets = useMemo(() => setsPerMuscle(history, lookup, weekStart, addDays(weekStart, 7)), [history, custom, weekStart]);
  const rangeSets = useMemo(() => setsPerMuscle(history, lookup, rangeFrom, Number.MAX_SAFE_INTEGER), [history, custom, rangeFrom]);
  const rangePRs = useMemo(() => prsInRange(history, rangeFrom, Number.MAX_SAFE_INTEGER, kindOf).reverse().slice(0, 8), [history, custom, rangeFrom]);

  const topExercises = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of history) if (w.startedAt >= rangeFrom) for (const e of new Set(w.exercises.map((x) => x.exerciseId))) m.set(e, (m.get(e) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [history, rangeFrom]);

  const weights = measurements.filter((m) => m.weightKg != null).map((m) => ({ date: m.date, value: m.weightKg as number }));
  const latestWeight = weights[weights.length - 1];

  const weekMuscles: Muscle[] = MUSCLES.filter((m) => m !== 'cardio');
  const rangeTotal = Object.values(rangeSets).reduce((a, b) => a + (b ?? 0), 0);
  const distribution = MUSCLES.map((m) => ({ m, v: rangeSets[m] ?? 0 }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v);

  if (history.length === 0 && measurements.length === 0) {
    return (
      <Screen>
        <Empty title="Nothing to chart yet" body="Finish a workout and your streaks, muscle volume, PRs and exercise charts appear here.">
          <Button title="Log bodyweight" onPress={() => router.push('/measurements')} />
        </Empty>
      </Screen>
    );
  }

  return (
    <Screen>
      <Segmented label="Range" options={RANGE_OPTIONS} value={range} onChange={setRange} />

      {/* Monthly report: the one inverted block */}
      <View style={{ backgroundColor: c.inverse, borderRadius: 8, padding: 16, gap: 12 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <IconButton name="left" label="Previous month" color={c.inkOnLight} onPress={() => setMonthOffset((o) => o - 1)} />
          <Label color={c.mutedOnLight}>
            Monthly report · {monthName(monthStart)} {new Date(monthStart).getFullYear()}
          </Label>
          <IconButton name="right" label="Next month" color={monthOffset < 0 ? c.inkOnLight : c.borderOnLight} onPress={() => setMonthOffset((o) => Math.min(0, o + 1))} />
        </Row>
        <Row style={{ alignItems: 'flex-start' }}>
          <Figure value={String(month.workouts)} label="Workouts" />
          <Figure value={duration(month.durationSec)} label="Trained" />
          <Figure value={String(monthPRs.length).padStart(2, '0')} label="PRs" />
        </Row>
        <View style={{ borderTopWidth: 1, borderTopColor: c.borderOnLight, paddingTop: 10, gap: 2 }}>
          <Text style={{ color: '#3A3F47', fontSize: 14 }}>
            {volume(month.volumeKg, unit)} lifted across {month.sets} working sets.
          </Text>
          <Text style={{ color: '#3A3F47', fontSize: 14 }}>
            {month.workouts - prevMonth.workouts >= 0 ? '+' : ''}
            {month.workouts - prevMonth.workouts} workouts vs {monthName(addMonths(monthStart, -1))}.
          </Text>
        </View>
      </View>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Label>Consistency · 12 weeks</Label>
          <Label>{grid.flat().filter(Boolean).length} days</Label>
        </Row>
        <ConsistencyGrid grid={grid} />
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Label>Sets per muscle · this week</Label>
          <Label>
            Target {TARGET_MIN}–{TARGET_MAX}
          </Label>
        </Row>
        {weekMuscles.map((m) => {
          const v = weekSets[m] ?? 0;
          const flag = v === 0 ? '' : v < TARGET_MIN ? 'LOW' : v > TARGET_MAX ? 'HIGH' : '';
          return (
            <Row key={m} style={{ gap: 10 }} >
              <Text style={[type.bodySm, { width: 86 }]}>{MUSCLE_LABEL[m]}</Text>
              <View style={{ flex: 1 }}>
                <BandBar value={v} scaleMax={24} bandMin={TARGET_MIN} bandMax={TARGET_MAX} />
              </View>
              <Text style={[type.data, { width: 64, textAlign: 'right', fontSize: 13, color: flag === 'LOW' ? c.warn : flag === 'HIGH' ? c.info : v ? c.ink : c.muted }]}>
                {num(v)} {flag}
              </Text>
            </Row>
          );
        })}
        <Text style={[type.bodySm, { color: c.muted, fontSize: 12 }]}>Secondary muscles count as half a set. Warm-ups don't count.</Text>
      </Card>

      {distribution.length ? (
        <Card>
          <Label>Muscle distribution · {RANGE_OPTIONS.find((r) => r.value === range)?.label}</Label>
          {distribution.map(({ m, v }) => (
            <Row key={m} style={{ gap: 10 }}>
              <Text style={[type.bodySm, { width: 86 }]}>{MUSCLE_LABEL[m]}</Text>
              <View style={{ flex: 1 }}>
                <BandBar value={v} scaleMax={distribution[0].v} />
              </View>
              <Text style={[type.data, { width: 48, textAlign: 'right', fontSize: 13 }]}>{Math.round((v / rangeTotal) * 100)}%</Text>
            </Row>
          ))}
        </Card>
      ) : null}

      <Card style={{ padding: 0, gap: 0 }}>
        <View style={{ padding: 16, paddingBottom: 8 }}>
          <Label>Recent PRs</Label>
        </View>
        {rangePRs.length === 0 ? <Text style={[type.bodySm, { padding: 16, paddingTop: 0 }]}>No PRs in this range yet. Records start counting from your second session of an exercise.</Text> : null}
        {rangePRs.map((p, i) => (
          <ListRow
            key={`${p.workoutId}-${p.exerciseId}-${p.kind}`}
            title={lookup(p.exerciseId)?.name ?? 'Exercise'}
            detail={`${PR_LABEL[p.kind]} · ${relativeDay(p.date)}`}
            value={formatPRValue(p.kind, p.value, unit)}
            onPress={() => router.push(`/exercise/${p.exerciseId}`)}
            last={i === rangePRs.length - 1}
          />
        ))}
      </Card>

      {topExercises.length ? (
        <Card style={{ padding: 0, gap: 0 }}>
          <View style={{ padding: 16, paddingBottom: 8 }}>
            <Label>Exercise stats</Label>
          </View>
          {topExercises.map(([id, count], i) => (
            <ListRow key={id} title={lookup(id)?.name ?? 'Exercise'} value={`${count}×`} onPress={() => router.push(`/exercise/${id}`)} last={i === topExercises.length - 1} />
          ))}
        </Card>
      ) : null}

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Label>Bodyweight</Label>
          <Button small variant="ghost" title="Measurements" onPress={() => router.push('/measurements')} />
        </Row>
        {latestWeight ? (
          <>
            <Text style={type.figure}>
              {weight(latestWeight.value, unit, false)} <Text style={[type.data, { color: c.muted }]}>{unit}</Text>
            </Text>
            <LineChart points={weights.slice(-30)} height={120} label="Bodyweight" format={(v) => num(toDisplayWeight(v, unit), 1)} />
          </>
        ) : (
          <Text style={type.bodySm}>No bodyweight logged yet.</Text>
        )}
      </Card>
    </Screen>
  );
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 30, fontWeight: '500', letterSpacing: -1, color: c.inkOnLight }}>{value}</Text>
      <Label color={c.mutedOnLight}>{label}</Label>
    </View>
  );
}
