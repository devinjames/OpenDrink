import { addDays, fromKey, toKey, type DateKey } from './dates.ts';
import type { Entries } from './stats.ts';

export const BACKFILL_WINDOW_DAYS = 7;

/**
 * Unlogged days from the last `windowDays` (excluding today), newest first. Days before
 * the user's first-ever entry are never included, so new users aren't asked about the
 * time before they installed the app.
 */
export function missingDays(
  entries: Entries,
  today: Date,
  windowDays = BACKFILL_WINDOW_DAYS
): DateKey[] {
  const keys = Object.keys(entries);
  if (!keys.length) return [];
  const firstKey = keys.reduce((a, b) => (a < b ? a : b));
  const first = fromKey(firstKey);

  const out: DateKey[] = [];
  for (let i = 1; i <= windowDays; i++) {
    const day = addDays(today, -i);
    if (day < first) break;
    const key = toKey(day);
    if (entries[key] === undefined) out.push(key);
  }
  return out;
}

/** Whether to show the prompt now: there are gaps and it hasn't been shown today. */
export function shouldPromptBackfill(
  entries: Entries,
  today: Date,
  lastPrompt: DateKey | null
): boolean {
  return lastPrompt !== toKey(today) && missingDays(entries, today).length > 0;
}
