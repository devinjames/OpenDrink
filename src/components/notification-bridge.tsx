import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { handleQuickLogResponse } from '@/lib/quick-log.ts';
import { remindersSupported } from '@/lib/reminders.ts';
import { useStore } from '@/store/index.tsx';

async function onResponse(response: Notifications.NotificationResponse) {
  const outcome = await handleQuickLogResponse(response);
  if (!outcome) {
    router.navigate('/');
    return;
  }
  router.navigate({
    pathname: '/',
    params: outcome.result === 'logged' ? { loggedSober: outcome.day } : { edit: outcome.day },
  });
}

/** Routes notification taps and "I was sober" actions once the store is ready. */
export function NotificationBridge() {
  const { ready } = useStore();

  useEffect(() => {
    if (!ready || !remindersSupported) return;
    // Launched (or resumed) from a notification before we were listening.
    const last = Notifications.getLastNotificationResponse();
    if (last) {
      // Clear so it isn't replayed on the next launch.
      Notifications.clearLastNotificationResponse();
      onResponse(last).catch((e) => console.warn('Quick-log failed', e));
    }
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      Notifications.clearLastNotificationResponse();
      onResponse(r).catch((e) => console.warn('Quick-log failed', e));
    });
    return () => sub.remove();
  }, [ready]);

  return null;
}
