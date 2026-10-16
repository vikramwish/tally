import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useStore } from '../store';

const CHANNEL = 'rest-timer';

try {
  Notifications.setNotificationHandler({
    // The in-app timer already shows the end of rest while the app is open.
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Rest timer',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
    }).catch(() => {});
  }
} catch {
  // Notifications unavailable (e.g. web); the in-app timer still works.
}

async function ensurePermission(): Promise<boolean> {
  try {
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    if (!cur.canAskAgain) return false;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

/**
 * Mounted once at the root. Schedules a local notification for the end
 * of each rest (so it fires with the phone locked), buzzes when rest ends
 * in the foreground, and clears the timer.
 */
export function RestWatcher() {
  const rest = useStore((s) => s.rest);
  const settings = useStore((s) => s.settings);
  const stopRest = useStore((s) => s.stopRest);
  const scheduled = useRef<string | null>(null);

  // (Re)schedule the background notification whenever the timer changes.
  useEffect(() => {
    let cancelled = false;
    const cancelPrev = async () => {
      if (scheduled.current) {
        const id = scheduled.current;
        scheduled.current = null;
        try {
          await Notifications.cancelScheduledNotificationAsync(id);
        } catch {}
      }
    };
    (async () => {
      await cancelPrev();
      if (!rest || !settings.restNotification || Platform.OS === 'web') return;
      const seconds = Math.round((rest.endsAt - Date.now()) / 1000);
      if (seconds < 2) return;
      if (!(await ensurePermission()) || cancelled) return;
      try {
        scheduled.current = await Notifications.scheduleNotificationAsync({
          content: { title: 'Rest over', body: 'Time for your next set.', sound: true },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, repeats: false, channelId: CHANNEL },
        });
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [rest?.endsAt, settings.restNotification]);

  // Foreground: buzz and clear exactly when the rest ends.
  useEffect(() => {
    if (!rest) return;
    const ms = Math.max(0, rest.endsAt - Date.now());
    const t = setTimeout(() => {
      if (settings.restHaptics && Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      stopRest();
    }, ms);
    return () => clearTimeout(t);
  }, [rest?.endsAt, settings.restHaptics, stopRest]);

  return null;
}
