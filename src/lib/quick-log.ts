import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { toKey, type DateKey } from './dates.ts';
import { logSoberIfUnlogged, type QuickLogResult } from './storage.ts';

export const CHECKIN_CATEGORY = 'daily-checkin';
export const ACTION_LOG_SOBER = 'log-sober';

export async function registerCheckinCategory(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(CHECKIN_CATEGORY, [
    {
      identifier: ACTION_LOG_SOBER,
      buttonTitle: 'I was sober today',
      // iOS only runs JS for action taps when the app is opened, so the button opens it
      // there. Android handles the tap in a background task without opening the app.
      options: { opensAppToForeground: Platform.OS === 'ios' },
    },
  ]);
}

export interface QuickLogOutcome {
  day: DateKey;
  result: QuickLogResult;
}

// The same response can reach us via the background task, the live listener and
// getLastNotificationResponse() on launch; only act on it once per JS context.
const handled = new Set<string>();

/**
 * Applies the "I was sober" action. The day is taken from when the reminder was
 * delivered, so tapping a 9pm reminder after midnight still logs the right day.
 * Returns null for responses that aren't a quick-log (e.g. a plain tap).
 */
export async function handleQuickLogResponse(
  response: Notifications.NotificationResponse
): Promise<QuickLogOutcome | null> {
  if (response.actionIdentifier !== ACTION_LOG_SOBER) return null;
  const { notification } = response;
  const id = `${notification.request.identifier}@${notification.date}`;
  if (handled.has(id)) return null;
  handled.add(id);

  const day = toKey(new Date(notification.date));
  const result = await logSoberIfUnlogged(day);
  await Notifications.dismissNotificationAsync(notification.request.identifier).catch(() => {});
  return { day, result };
}
