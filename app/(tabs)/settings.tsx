import { router } from 'expo-router';
import { Alert, Share, Text, View } from 'react-native';

import { Button, Card, Chip, Label, ListRow, Row, Screen, Segmented, ToggleRow } from '../../src/components/ui';
import { clock, num } from '../../src/lib/format';
import { DEFAULT_SETTINGS, useStore } from '../../src/store';
import { c, type } from '../../src/theme';

const REST_OPTIONS = [60, 90, 120, 150, 180, 240];
const BAR_OPTIONS = [15, 20];
const ALL_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5];

export default function Settings() {
  const s = useStore((st) => st.settings);
  const set = useStore((st) => st.updateSettings);
  const reset = useStore((st) => st.resetAll);
  const counts = { w: useStore((st) => st.history.length), r: useStore((st) => st.routines.length) };

  const cycle = <T,>(list: T[], cur: T) => list[(list.indexOf(cur) + 1) % list.length];

  const exportData = async () => {
    const st = useStore.getState();
    const data = {
      exportedAt: new Date().toISOString(),
      settings: st.settings,
      routines: st.routines,
      folders: st.folders,
      history: st.history,
      measurements: st.measurements,
      customExercises: st.customExercises,
    };
    await Share.share({ message: JSON.stringify(data) });
  };

  return (
    <Screen>
      <Label>Units</Label>
      <Segmented
        label="Weight unit"
        options={[
          { value: 'kg', label: 'Kilograms' },
          { value: 'lb', label: 'Pounds' },
        ]}
        value={s.unit}
        onChange={(unit) => set({ unit })}
      />

      <Label style={{ marginTop: 8 }}>Workout</Label>
      <Card style={{ padding: 0, gap: 0 }}>
        <ListRow title="Default rest timer" detail="For newly added exercises" value={clock(s.defaultRestSec)} onPress={() => set({ defaultRestSec: cycle(REST_OPTIONS, s.defaultRestSec) })} />
        <ToggleRow title="Start rest timer automatically" detail="When you tick off a set" value={s.autoStartRest} onChange={(v) => set({ autoStartRest: v })} />
        <ToggleRow title="Vibrate when rest ends" value={s.restHaptics} onChange={(v) => set({ restHaptics: v })} />
        <ToggleRow title="Rest notification" detail="Alerts you when rest ends with the phone locked" value={s.restNotification} onChange={(v) => set({ restNotification: v })} />
        <ListRow
          title="Previous values from"
          detail={s.previousFrom === 'routine' ? 'The last time you did this routine' : 'The last time you did the exercise'}
          value={s.previousFrom === 'routine' ? 'Same routine' : 'Any workout'}
          onPress={() => set({ previousFrom: s.previousFrom === 'any' ? 'routine' : 'any' })}
        />
        <ToggleRow title="Track RPE" detail="Rate how hard each set felt (6–10)" value={s.rpeEnabled} onChange={(v) => set({ rpeEnabled: v })} />
        <ToggleRow title="Keep screen awake" detail="During a workout" value={s.keepAwake} onChange={(v) => set({ keepAwake: v })} />
        <ListRow title="Weekly goal" detail="Workouts per week for the home streak card" value={String(s.weeklyGoal)} onPress={() => set({ weeklyGoal: (s.weeklyGoal % 7) + 1 })} last />
      </Card>

      <Label style={{ marginTop: 8 }}>Plate calculator (kg)</Label>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={type.body}>Bar weight</Text>
          <Row>
            {BAR_OPTIONS.map((b) => (
              <Chip key={b} label={`${b} kg`} selected={s.barWeightKg === b} onPress={() => set({ barWeightKg: b })} />
            ))}
          </Row>
        </Row>
        <View style={{ gap: 6 }}>
          <Text style={type.body}>Plates you have</Text>
          <Row style={{ flexWrap: 'wrap', gap: 6 }}>
            {ALL_PLATES.map((p) => {
              const on = s.platesKg.includes(p);
              return (
                <Chip
                  key={p}
                  label={num(p, 2)}
                  selected={on}
                  onPress={() => set({ platesKg: on ? s.platesKg.filter((x) => x !== p) : [...s.platesKg, p].sort((a, b) => b - a) })}
                />
              );
            })}
          </Row>
          <Text style={[type.bodySm, { color: c.muted, fontSize: 12 }]}>In pounds mode the calculator uses a 45 lb bar and 45/35/25/10/5/2.5 plates.</Text>
        </View>
      </Card>

      <Label style={{ marginTop: 8 }}>Data</Label>
      <Card style={{ padding: 0, gap: 0 }}>
        <ListRow title="Exercise library" detail="Browse and add custom exercises" onPress={() => router.push('/exercise/picker?mode=browse')} />
        <ListRow title="Body measurements" onPress={() => router.push('/measurements')} />
        <ListRow title="Export data (JSON)" detail={`${counts.w} workouts · ${counts.r} routines`} onPress={exportData} last />
      </Card>

      <Button
        title="Reset everything"
        variant="danger"
        onPress={() =>
          Alert.alert('Delete all data?', 'Workouts, routines, measurements and settings are removed from this phone. This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete everything', style: 'destructive', onPress: reset },
          ])
        }
      />
      <Button title="Restore default settings" variant="subtle" onPress={() => set(DEFAULT_SETTINGS)} />
    </Screen>
  );
}
