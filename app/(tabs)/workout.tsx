import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import { Icon } from '../../src/components/icons';
import { Button, Card, Empty, IconButton, Label, Row, Screen } from '../../src/components/ui';
import { ActiveWorkoutBanner } from '../../src/components/WorkoutBits';
import { relativeDay } from '../../src/lib/format';
import type { Routine } from '../../src/lib/types';
import { exerciseName, useStore } from '../../src/store';
import { c, radius, space, type } from '../../src/theme';

/** Starts something, asking first if a workout is already running. */
function useStarter() {
  const active = useStore((s) => s.active);
  const discard = useStore((s) => s.discardWorkout);
  return (start: () => void) => {
    if (!active) {
      start();
      router.push('/workout/live');
      return;
    }
    Alert.alert('Workout in progress', `“${active.name}” is still running.`, [
      { text: 'Resume it', onPress: () => router.push('/workout/live') },
      {
        text: 'Discard and start new',
        style: 'destructive',
        onPress: () => {
          discard();
          start();
          router.push('/workout/live');
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };
}

export default function WorkoutTab() {
  const routines = useStore((s) => s.routines);
  const folders = useStore((s) => s.folders);
  const addFolder = useStore((s) => s.addFolder);
  const beginDraft = useStore((s) => s.beginRoutineDraft);
  const startEmpty = useStore((s) => s.startEmptyWorkout);
  const run = useStarter();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [newFolder, setNewFolder] = useState<string | null>(null);

  const groups: Array<{ id: string | null; name: string; items: Routine[] }> = [
    ...folders.map((f) => ({ id: f.id, name: f.name, items: routines.filter((r) => r.folderId === f.id) })),
    { id: null, name: folders.length ? 'Not in a folder' : 'My routines', items: routines.filter((r) => !r.folderId || !folders.some((f) => f.id === r.folderId)) },
  ];

  return (
    <Screen>
      <ActiveWorkoutBanner />
      <Button title="Start empty workout" icon="plus" variant="primary" onPress={() => run(startEmpty)} />
      <Row>
        <Button
          title="New routine"
          style={{ flex: 1 }}
          onPress={() => {
            beginDraft();
            router.push('/routine/edit');
          }}
        />
        <Button title="Exercises" style={{ flex: 1 }} onPress={() => router.push('/exercise/picker?mode=browse')} />
      </Row>

      <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
        <Label>Routines · {routines.length}</Label>
        <IconButton name="folder" label="New folder" color={c.muted} onPress={() => setNewFolder('')} />
      </Row>

      {newFolder !== null ? (
        <Row>
          <TextInput
            autoFocus
            value={newFolder}
            onChangeText={setNewFolder}
            placeholder="Folder name"
            placeholderTextColor={c.muted}
            accessibilityLabel="Folder name"
            style={inputStyle}
            onSubmitEditing={() => {
              if (newFolder.trim()) addFolder(newFolder);
              setNewFolder(null);
            }}
          />
          <Button small title="Add" onPress={() => {
            if (newFolder.trim()) addFolder(newFolder);
            setNewFolder(null);
          }} />
          <IconButton name="close" label="Cancel" onPress={() => setNewFolder(null)} />
        </Row>
      ) : null}

      {routines.length === 0 && folders.length === 0 ? (
        <Empty title="No routines yet" body="A routine is a saved list of exercises and target sets. Start one from scratch, or save any finished workout as a routine." />
      ) : (
        groups
          .filter((g) => g.id !== null || g.items.length > 0)
          .map((g) => {
            const key = g.id ?? '_none';
            const isCollapsed = collapsed[key];
            return (
              <View key={key} style={{ gap: 8 }}>
                <FolderHeader
                  id={g.id}
                  name={g.name}
                  count={g.items.length}
                  collapsed={!!isCollapsed}
                  onToggle={() => setCollapsed((s) => ({ ...s, [key]: !s[key] }))}
                />
                {!isCollapsed
                  ? g.items.map((r) => <RoutineCard key={r.id} routine={r} onStart={() => run(() => useStore.getState().startRoutine(r.id))} />)
                  : null}
                {!isCollapsed && g.id && g.items.length === 0 ? <Label>Empty folder</Label> : null}
              </View>
            );
          })
      )}
    </Screen>
  );
}

function FolderHeader({ id, name, count, collapsed, onToggle }: { id: string | null; name: string; count: number; collapsed: boolean; onToggle: () => void }) {
  const deleteFolder = useStore((s) => s.deleteFolder);
  const beginDraft = useStore((s) => s.beginRoutineDraft);
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: !collapsed }} onPress={onToggle} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, flex: 1 }}>
        <Icon name={collapsed ? 'right' : 'down'} size={16} color={c.muted} />
        <Text style={type.h3}>{name}</Text>
        <Label>({count})</Label>
      </Pressable>
      {id ? (
        <IconButton
          name="more"
          label={`Folder ${name} options`}
          color={c.muted}
          onPress={() =>
            Alert.alert(name, undefined, [
              {
                text: 'New routine in folder',
                onPress: () => {
                  beginDraft(undefined, id);
                  router.push('/routine/edit');
                },
              },
              { text: 'Delete folder (keeps routines)', style: 'destructive', onPress: () => deleteFolder(id) },
              { text: 'Cancel', style: 'cancel' },
            ])
          }
        />
      ) : null}
    </Row>
  );
}

function RoutineCard({ routine, onStart }: { routine: Routine; onStart: () => void }) {
  const custom = useStore((s) => s.customExercises);
  const history = useStore((s) => s.history);
  const beginDraft = useStore((s) => s.beginRoutineDraft);
  const duplicate = useStore((s) => s.duplicateRoutine);
  const del = useStore((s) => s.deleteRoutine);
  const last = history.filter((w) => w.routineId === routine.id).sort((a, b) => b.startedAt - a.startedAt)[0];
  const names = routine.exercises.map((e) => exerciseName({ customExercises: custom }, e.exerciseId)).join(', ');

  return (
    <Card style={{ gap: 8, paddingVertical: 12 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={type.h3} numberOfLines={1}>
          {routine.name}
        </Text>
        <Row style={{ gap: 0 }}>
          <Label>{last ? `Last · ${relativeDay(last.startedAt)}` : 'Not done yet'}</Label>
          <IconButton
            name="more"
            label={`${routine.name} options`}
            color={c.muted}
            onPress={() =>
              Alert.alert(routine.name, undefined, [
                {
                  text: 'Edit',
                  onPress: () => {
                    beginDraft(routine.id);
                    router.push('/routine/edit');
                  },
                },
                { text: 'Duplicate', onPress: () => duplicate(routine.id) },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () =>
                    Alert.alert('Delete routine?', 'Workouts you already logged are kept.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => del(routine.id) },
                    ]),
                },
                { text: 'Cancel', style: 'cancel' },
              ])
            }
          />
        </Row>
      </Row>
      <Text style={[type.bodySm, { color: c.muted, fontSize: 13 }]} numberOfLines={2}>
        {names || 'No exercises'}
      </Text>
      <Button small title="Start routine" onPress={onStart} disabled={routine.exercises.length === 0} />
    </Card>
  );
}

const inputStyle = {
  flex: 1,
  height: 44,
  backgroundColor: c.sunken,
  borderColor: c.border,
  borderWidth: 1,
  borderRadius: radius.md,
  color: c.ink,
  paddingHorizontal: space[3],
  fontSize: 16,
} as const;
