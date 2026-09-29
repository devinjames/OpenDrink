/**
 * Android background handler for the "I was sober" notification action. Must be
 * defined at module scope and loaded before the app renders (see /index.ts).
 */
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { handleQuickLogResponse } from './quick-log.ts';

const TASK = 'opendrink-quick-log';

if (Platform.OS === 'android') {
  TaskManager.defineTask<Notifications.NotificationTaskPayload>(TASK, async ({ data, error }) => {
    if (error || !data || !('actionIdentifier' in data)) return;
    await handleQuickLogResponse(data);
  });
  Notifications.registerTaskAsync(TASK).catch((e) =>
    console.warn('Failed to register quick-log task', e)
  );
}
