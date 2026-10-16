import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../../src/components/icons';
import { Button, Chip, Label, Row } from '../../src/components/ui';
import { EQUIPMENT_LABEL, MUSCLE_LABEL, MUSCLES } from '../../src/lib/exercises';
import type { Muscle } from '../../src/lib/types';
import { allExercises, useStore } from '../../src/store';
import * as ops from '../../src/store/ops';
import { c, radius, space, type } from '../../src/theme';

type Mode = 'browse' | 'workout' | 'routine';

export default function Picker() {
  const { mode: modeParam } = useLocalSearchParams<{ mode?: Mode }>();
  const mode: Mode = modeParam === 'workout' || modeParam === 'routine' ? modeParam : 'browse';
  const insets = useSafeAreaInsets();
  const custom = useStore((s) => s.customExercises);
  const history = useStore((s) => s.history);
  const settings = useStore((s) => s.settings);
  const updateActive = useStore((s) => s.updateActive);
  const updateDraft = useStore((s) => s.updateDraft);

  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const [picked, setPicked] = useState<string[]>([]);

  // Most-used first, then alphabetical.
  const usage = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of history) for (const e of w.exercises) m.set(e.exerciseId, (m.get(e.exerciseId) ?? 0) + 1);
    return m;
  }, [history]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return allExercises({ customExercises: custom })
      .filter((e) => (!muscle || e.primary === muscle || e.secondary.includes(muscle)) && (!needle || e.name.toLowerCase().includes(needle)))
      .sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0) || a.name.localeCompare(b.name));
  }, [q, muscle, custom, usage]);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const commit = () => {
    if (mode === 'workout') updateActive((w) => ops.addExercises(w, picked, history, settings));
    if (mode === 'routine') updateDraft((r) => ops.addExercisesToRoutine(r, picked, settings.defaultRestSec));
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ padding: space[4], gap: space[3] }}>
        <Row style={{ backgroundColor: c.sunken, borderRadius: radius.md, paddingHorizontal: space[3], borderWidth: 1, borderColor: c.border }}>
          <Icon name="search" size={18} color={c.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search exercises"
            placeholderTextColor={c.muted}
            accessibilityLabel="Search exercises"
            autoCorrect={false}
            style={{ flex: 1, height: 44, color: c.ink, fontSize: 16 }}
          />
        </Row>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          <Chip label="All" selected={!muscle} onPress={() => setMuscle(null)} />
          {MUSCLES.map((m) => (
            <Chip key={m} label={MUSCLE_LABEL[m]} selected={muscle === m} onPress={() => setMuscle(muscle === m ? null : m)} />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={list}
        keyExtractor={(e) => e.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        ListHeaderComponent={
          <Pressable accessibilityRole="button" onPress={() => router.push('/exercise/new')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space[4], minHeight: 52 }}>
            <Icon name="plus" size={18} color={c.emberText} />
            <Text style={[type.button, { color: c.emberText }]}>Create custom exercise</Text>
          </Pressable>
        }
        ListEmptyComponent={<Text style={[type.bodySm, { padding: space[4] }]}>No exercises match. Try another search or create a custom one.</Text>}
        renderItem={({ item }) => {
          const order = picked.indexOf(item.id);
          const on = order >= 0;
          return (
            <Pressable
              accessibilityRole={mode === 'browse' ? 'link' : 'checkbox'}
              accessibilityState={mode === 'browse' ? undefined : { checked: on }}
              onPress={() => (mode === 'browse' ? router.push(`/exercise/${item.id}`) : toggle(item.id))}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: space[4],
                minHeight: 60,
                borderTopWidth: 1,
                borderTopColor: c.border,
                backgroundColor: on ? c.dawn : pressed ? c.sunken : 'transparent',
              })}
            >
              <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={[type.label, { color: c.ink2 }]}>{item.name.slice(0, 2)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={type.body}>{item.name}</Text>
                <Label>
                  {MUSCLE_LABEL[item.primary]} · {EQUIPMENT_LABEL[item.equipment]}
                  {item.custom ? ' · Custom' : ''}
                  {usage.get(item.id) ? ` · ${usage.get(item.id)}×` : ''}
                </Label>
              </View>
              {mode === 'browse' ? (
                <Icon name="right" size={16} color={c.muted} />
              ) : on ? (
                <View style={{ width: 24, height: 24, borderRadius: radius.sm, backgroundColor: c.ember, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={[type.data, { color: c.onEmber, fontSize: 12 }]}>{order + 1}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        }}
      />

      {mode !== 'browse' ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: space[4], paddingBottom: insets.bottom + space[4], backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.border }}>
          <Button
            variant="primary"
            title={picked.length ? `Add ${picked.length} exercise${picked.length === 1 ? '' : 's'}` : 'Select exercises'}
            disabled={!picked.length}
            onPress={commit}
          />
        </View>
      ) : null}
    </View>
  );
}
