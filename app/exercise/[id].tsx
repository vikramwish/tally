import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { LineChart } from '../../src/components/charts';
import { Card, Empty, Label, ListRow, Row, Screen, Segmented } from '../../src/components/ui';
import { toDisplayWeight } from '../../src/lib/calc';
import { clock, num, relativeDay, volume, weight } from '../../src/lib/format';
import { EQUIPMENT_LABEL, MUSCLE_LABEL } from '../../src/lib/exercises';
import { computeRecords, exerciseSeries, exerciseSessions, PR_LABEL, type PRKind, type SeriesMetric } from '../../src/lib/stats';
import { lookupExercise, useStore } from '../../src/store';
import { formatPRValue } from '../../src/prFormat';
import type { WorkoutSet } from '../../src/lib/types';
import { c, SET_TYPE_STYLE, space, type } from '../../src/theme';

const REP_COLUMNS = [1, 3, 5, 8, 10, 12];

/** Working sets are numbered 1, 2, 3…; other types show their letter. */
function numbered(sets: WorkoutSet[]): Array<{ s: WorkoutSet; label: string }> {
  let n = 0;
  return sets.map((s) => {
    if (s.type !== 'warmup') n++;
    return { s, label: s.type === 'normal' ? String(n) : SET_TYPE_STYLE[s.type].short };
  });
}

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const custom = useStore((s) => s.customExercises);
  const history = useStore((s) => s.history);
  const unit = useStore((s) => s.settings.unit);
  const ex = lookupExercise({ customExercises: custom }, id ?? '');

  const metrics: Array<{ value: SeriesMetric; label: string }> =
    ex?.kind === 'reps_only'
      ? [{ value: 'totalReps', label: 'Reps' }]
      : ex?.kind === 'duration'
        ? [{ value: 'longest', label: 'Longest' }]
        : [
            { value: 'best1RM', label: '1RM' },
            { value: 'heaviest', label: 'Heaviest' },
            { value: 'sessionVolume', label: 'Volume' },
            { value: 'totalReps', label: 'Reps' },
          ];
  const [metric, setMetric] = useState<SeriesMetric>(metrics[0].value);

  const series = useMemo(() => exerciseSeries(history, id ?? '', metric).slice(-24), [history, id, metric]);
  const records = useMemo(() => computeRecords(history, id ?? ''), [history, id]);
  const sessions = useMemo(() => exerciseSessions(history, id ?? '').slice(0, 10), [history, id]);

  if (!ex) {
    return (
      <Screen>
        <Text style={type.h3}>Exercise not found</Text>
      </Screen>
    );
  }

  const fmtMetric = (v: number) =>
    metric === 'totalReps' ? `${num(v, 0)}` : metric === 'longest' ? clock(v) : metric === 'sessionVolume' ? num(Math.round(toDisplayWeight(v, unit)), 0) : num(toDisplayWeight(v, unit), 1);
  const latest = series[series.length - 1];
  const first = series[0];
  const delta = latest && first ? latest.value - first.value : 0;
  const unitLabel = metric === 'totalReps' ? 'reps' : metric === 'longest' ? '' : unit;

  const recordKinds: PRKind[] =
    ex.kind === 'weight_reps' ? ['heaviest', 'best1RM', 'bestSetVolume', 'bestSessionVolume'] : ex.kind === 'reps_only' ? ['mostReps'] : ['longest'];

  return (
    <Screen>
      <Stack.Screen options={{ title: ex.name }} />
      <Label>
        {EQUIPMENT_LABEL[ex.equipment]} · {MUSCLE_LABEL[ex.primary]}
        {ex.secondary.length ? ` · ${ex.secondary.map((m) => MUSCLE_LABEL[m]).join(', ')}` : ''}
      </Label>

      {records.sessions === 0 ? (
        <Empty title="Not logged yet" body="Once you complete a set of this exercise, charts and records show up here." />
      ) : (
        <>
          <View style={{ gap: 10 }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <View>
                <Label>
                  {metrics.find((m) => m.value === metric)?.label} · {series.length} sessions
                </Label>
                <Text style={type.figure}>
                  {latest ? fmtMetric(latest.value) : '—'} <Text style={[type.data, { color: c.muted }]}>{unitLabel}</Text>
                </Text>
              </View>
              {series.length > 1 ? (
                <Label color={delta >= 0 ? c.ok : c.warn}>
                  {delta >= 0 ? '+' : '−'}
                  {fmtMetric(Math.abs(delta))} {unitLabel}
                </Label>
              ) : null}
            </Row>
            <LineChart points={series} format={fmtMetric} label={`${ex.name} ${metric}`} />
            {metrics.length > 1 ? <Segmented label="Chart metric" options={metrics} value={metric} onChange={setMetric} /> : null}
          </View>

          <Card style={{ padding: 0, gap: 0 }}>
            <View style={{ padding: space[4], paddingBottom: space[2] }}>
              <Label>Personal records</Label>
            </View>
            {recordKinds.map((k, i) => {
              const r = records[k];
              return (
                <ListRow
                  key={k}
                  title={PR_LABEL[k]}
                  detail={r ? relativeDay(r.date) + (r.weightKg && r.reps ? ` · ${weight(r.weightKg, unit)} × ${r.reps}` : '') : undefined}
                  value={r ? formatPRValue(k, r.value, unit) : '—'}
                  last={i === recordKinds.length - 1}
                />
              );
            })}
          </Card>

          {ex.kind === 'weight_reps' ? (
            <View style={{ gap: 8 }}>
              <Label>Best weight for at least N reps</Label>
              <Row style={{ gap: 0, borderWidth: 1, borderColor: c.border, borderRadius: 8 }}>
                {REP_COLUMNS.map((n, i) => (
                  <View key={n} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderLeftWidth: i ? 1 : 0, borderLeftColor: c.border }}>
                    <Label style={{ fontSize: 10 }}>{n} rep</Label>
                    <Text style={[type.data, { fontSize: 13 }]}>{records.repRecords[n] ? weight(records.repRecords[n].value, unit, false) : '—'}</Text>
                  </View>
                ))}
              </Row>
            </View>
          ) : null}

          <Label>History</Label>
          {sessions.map(({ workout, sets }) => (
            <Card key={workout.id} onPress={() => router.push(`/history/${workout.id}`)} accessibilityLabel={`${workout.name}, ${relativeDay(workout.startedAt)}`} style={{ gap: 6 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={type.h3} numberOfLines={1}>
                  {workout.name}
                </Text>
                <Label>{relativeDay(workout.startedAt)}</Label>
              </Row>
              {numbered(sets.filter((s) => s.done)).map(({ s, label }) => (
                  <Text key={s.id} style={[type.data, { color: s.type === 'warmup' ? c.muted : c.ink2, fontSize: 13 }]}>
                    {label}{'  '}
                    {ex.kind === 'weight_reps'
                      ? `${weight(s.weightKg, unit)} × ${s.reps ?? '—'}`
                      : ex.kind === 'reps_only'
                        ? `${s.reps ?? '—'} reps`
                        : clock(s.durationSec ?? 0)}
                    {s.rpe ? `  @${s.rpe}` : ''}
                  </Text>
                ))}
              {ex.kind === 'weight_reps' ? (
                <Label>Volume {volume(sets.filter((s) => s.done && s.type !== 'warmup').reduce((v, s) => v + (s.weightKg ?? 0) * (s.reps ?? 0), 0), unit)}</Label>
              ) : null}
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
