import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Button, Chip, Label, Row, Screen } from '../../src/components/ui';
import { EQUIPMENT_LABEL, MUSCLE_LABEL, MUSCLES } from '../../src/lib/exercises';
import type { Equipment, ExerciseKind, Muscle } from '../../src/lib/types';
import { useStore } from '../../src/store';
import { c, radius, space, type } from '../../src/theme';

const KINDS: Array<{ value: ExerciseKind; label: string }> = [
  { value: 'weight_reps', label: 'Weight & reps' },
  { value: 'reps_only', label: 'Reps only' },
  { value: 'duration', label: 'Duration' },
];

export default function NewExercise() {
  const add = useStore((s) => s.addCustomExercise);
  const [name, setName] = useState('');
  const [equipment, setEquipment] = useState<Equipment>('barbell');
  const [primary, setPrimary] = useState<Muscle>('chest');
  const [secondary, setSecondary] = useState<Muscle[]>([]);
  const [kind, setKind] = useState<ExerciseKind>('weight_reps');

  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <Label>Name</Label>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Landmine Press"
          placeholderTextColor={c.muted}
          accessibilityLabel="Exercise name"
          autoFocus
          style={{ height: 44, backgroundColor: c.sunken, borderColor: c.border, borderWidth: 1, borderRadius: radius.md, color: c.ink, paddingHorizontal: space[3], fontSize: 16 }}
        />
      </View>

      <Section title="Tracks">
        {KINDS.map((k) => (
          <Chip key={k.value} label={k.label} selected={kind === k.value} onPress={() => setKind(k.value)} />
        ))}
      </Section>

      <Section title="Equipment">
        {(Object.keys(EQUIPMENT_LABEL) as Equipment[]).map((e) => (
          <Chip key={e} label={EQUIPMENT_LABEL[e]} selected={equipment === e} onPress={() => setEquipment(e)} />
        ))}
      </Section>

      <Section title="Primary muscle">
        {MUSCLES.map((m) => (
          <Chip
            key={m}
            label={MUSCLE_LABEL[m]}
            selected={primary === m}
            onPress={() => {
              setPrimary(m);
              setSecondary((s) => s.filter((x) => x !== m));
            }}
          />
        ))}
      </Section>

      <Section title="Secondary muscles (optional)">
        {MUSCLES.filter((m) => m !== primary).map((m) => (
          <Chip key={m} label={MUSCLE_LABEL[m]} selected={secondary.includes(m)} onPress={() => setSecondary((s) => (s.includes(m) ? s.filter((x) => x !== m) : [...s, m]))} />
        ))}
      </Section>

      <Text style={[type.bodySm, { color: c.muted }]}>Secondary muscles count as half a set in your weekly muscle totals.</Text>

      <Button
        title="Save exercise"
        variant="primary"
        disabled={!name.trim()}
        onPress={() => {
          add({ name: name.trim(), equipment, primary, secondary, kind });
          router.back();
        }}
      />
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Label>{title}</Label>
      <Row style={{ flexWrap: 'wrap', gap: 6 }}>{children}</Row>
    </View>
  );
}
