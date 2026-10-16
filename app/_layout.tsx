import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RestWatcher } from '../src/components/RestWatcher';
import { useStore } from '../src/store';
import { c } from '../src/theme';

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: c.bg, card: c.bg, border: c.border, text: c.ink, primary: c.ember },
};

function useHydrated() {
  const [ok, setOk] = useState(() => useStore.persist.hasHydrated());
  useEffect(() => {
    const unsub = useStore.persist.onFinishHydration(() => setOk(true));
    setOk(useStore.persist.hasHydrated());
    return unsub;
  }, []);
  return ok;
}

export default function RootLayout() {
  const hydrated = useHydrated();
  return (
    <SafeAreaProvider>
      <ThemeProvider value={navTheme}>
        <StatusBar style="light" />
        {hydrated ? (
          <>
            <RestWatcher />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: c.bg },
                headerTintColor: c.ink,
                headerTitleStyle: { fontWeight: '600' },
                headerShadowVisible: false,
                headerBackTitle: 'Back',
                contentStyle: { backgroundColor: c.bg },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="workout/live" options={{ presentation: 'fullScreenModal', headerShown: false, gestureEnabled: false }} />
              <Stack.Screen name="workout/finish" options={{ title: 'Save workout', presentation: 'modal' }} />
              <Stack.Screen name="workout/plates" options={{ title: 'Plates & warm-up', presentation: 'modal' }} />
              <Stack.Screen name="exercise/picker" options={{ title: 'Exercises', presentation: 'modal' }} />
              <Stack.Screen name="exercise/new" options={{ title: 'Custom exercise', presentation: 'modal' }} />
              {/* Detail screens open from inside modals (live workout, picker),
                  so they are modals too; a pushed card can end up behind a modal. */}
              <Stack.Screen name="exercise/[id]" options={{ title: '', presentation: 'modal' }} />
              <Stack.Screen name="routine/edit" options={{ title: 'Routine', presentation: 'modal', gestureEnabled: false }} />
              <Stack.Screen name="history/[id]" options={{ title: 'Workout', presentation: 'modal' }} />
              <Stack.Screen name="measurements" options={{ title: 'Body measurements' }} />
            </Stack>
          </>
        ) : (
          <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={c.ember} accessibilityLabel="Loading" />
          </View>
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
