import { Tabs } from 'expo-router';

import { Icon, type IconName } from '../../src/components/icons';
import { c, mono } from '../../src/theme';

const tabIcon = (name: IconName) =>
  function TabIcon({ color }: { color: string }) {
    return <Icon name={name} size={22} color={color} />;
  };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: c.bg },
        headerTintColor: c.ink,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '600' },
        tabBarStyle: { backgroundColor: c.bg, borderTopColor: c.border },
        tabBarActiveTintColor: c.ink,
        tabBarInactiveTintColor: c.muted,
        tabBarLabelStyle: { fontFamily: mono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', headerTitle: 'TALLY', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="workout" options={{ title: 'Workout', tabBarIcon: tabIcon('dumbbell') }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: tabIcon('chart') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: tabIcon('gear') }} />
    </Tabs>
  );
}
