import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { LineChart } from '../src/components/charts';
import { NumberField } from '../src/components/NumberField';
import { Button, Card, IconButton, Label, Row, Screen, Segmented } from '../src/components/ui';
import { fromDisplayWeight, toDisplayWeight } from '../src/lib/calc';
import { num, shortDate, weight } from '../src/lib/format';
import type { Measurement } from '../src/lib/types';
import { useStore } from '../src/store';
import { c, type } from '../src/theme';

type Field = 'weightKg' | 'bodyFatPct' | 'waistCm' | 'chestCm' | 'armCm' | 'thighCm';
const FIELDS: Array<{ key: Field; label: string; unit: string }> = [
  { key: 'weightKg', label: 'Bodyweight', unit: '' },
  { key: 'bodyFatPct', label: 'Body fat', unit: '%' },
  { key: 'waistCm', label: 'Waist', unit: 'cm' },
  { key: 'chestCm', label: 'Chest', unit: 'cm' },
  { key: 'armCm', label: 'Arm', unit: 'cm' },
  { key: 'thighCm', label: 'Thigh', unit: 'cm' },
];

const EMPTY: Record<Field, number | null> = { weightKg: null, bodyFatPct: null, waistCm: null, chestCm: null, armCm: null, thighCm: null };

export default function Measurements() {
  const unit = useStore((s) => s.settings.unit);
  const list = useStore((s) => s.measurements);
  const add = useStore((s) => s.addMeasurement);
  const del = useStore((s) => s.deleteMeasurement);
  const [form, setForm] = useState<Record<Field, number | null>>(EMPTY);
  const [chartField, setChartField] = useState<Field>('weightKg');

  const fieldUnit = (f: Field) => (f === 'weightKg' ? unit : FIELDS.find((x) => x.key === f)!.unit);
  const show = (m: Measurement, f: Field) => {
    const v = m[f];
    if (v == null) return null;
    return f === 'weightKg' ? weight(v, unit) : `${num(v, 1)} ${fieldUnit(f)}`;
  };
  const anyFilled = Object.values(form).some((v) => v != null);
  const points = list.filter((m) => m[chartField] != null).map((m) => ({ date: m.date, value: m[chartField] as number }));
  const chartOptions = FIELDS.filter((f) => list.some((m) => m[f.key] != null)).map((f) => ({ value: f.key, label: f.label.split(' ')[0] }));

  return (
    <Screen>
      <Card>
        <Label>Log today</Label>
        <View style={{ gap: 8 }}>
          {FIELDS.map((f) => (
            <Row key={f.key} style={{ justifyContent: 'space-between' }}>
              <Text style={type.body}>{f.label}</Text>
              <Row>
                <NumberField
                  style={{ width: 96 }}
                  value={form[f.key] == null ? null : f.key === 'weightKg' ? toDisplayWeight(form[f.key] as number, unit) : form[f.key]}
                  onCommit={(n) => setForm((s) => ({ ...s, [f.key]: n == null ? null : f.key === 'weightKg' ? fromDisplayWeight(n, unit) : n }))}
                  placeholder="—"
                  accessibilityLabel={`${f.label} in ${fieldUnit(f.key)}`}
                />
                <Label style={{ width: 24 }}>{fieldUnit(f.key)}</Label>
              </Row>
            </Row>
          ))}
        </View>
        <Button
          variant="primary"
          title="Save measurements"
          disabled={!anyFilled}
          onPress={() => {
            add({ date: Date.now(), ...form });
            setForm(EMPTY);
          }}
        />
      </Card>

      {chartOptions.length ? (
        <Card>
          {chartOptions.length > 1 ? (
            <Segmented label="Chart" options={chartOptions} value={chartOptions.some((o) => o.value === chartField) ? chartField : chartOptions[0].value} onChange={setChartField} />
          ) : (
            <Label>{FIELDS.find((f) => f.key === chartOptions[0].value)?.label}</Label>
          )}
          <LineChart
            points={points}
            label={chartField}
            format={(v) => (chartField === 'weightKg' ? num(toDisplayWeight(v, unit), 1) : num(v, 1))}
          />
        </Card>
      ) : null}

      <Label>History</Label>
      {[...list].reverse().map((m) => (
        <Card key={m.id} style={{ gap: 4, paddingVertical: 10 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Label>{shortDate(m.date)} · {new Date(m.date).getFullYear()}</Label>
            <IconButton
              name="trash"
              size={16}
              color={c.muted}
              label="Delete entry"
              onPress={() =>
                Alert.alert('Delete entry?', undefined, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => del(m.id) },
                ])
              }
            />
          </Row>
          <Row style={{ flexWrap: 'wrap', columnGap: 16 }}>
            {FIELDS.map((f) => {
              const v = show(m, f.key);
              return v ? (
                <Text key={f.key} style={[type.data, { fontSize: 13 }]}>
                  <Text style={{ color: c.muted }}>{f.label} </Text>
                  {v}
                </Text>
              ) : null;
            })}
          </Row>
        </Card>
      ))}
      {list.length === 0 ? <Text style={type.bodySm}>Nothing logged yet.</Text> : null}
    </Screen>
  );
}
