import { addDays, daysBetween, fromKey, toKey, type DateKey } from './dates.ts';
import type { Entries } from './stats.ts';

/** A promise to stay sober for `days` consecutive days starting on `start`. */
export interface SoberCommitment {
  start: DateKey;
  days: number;
}

export const COMMITMENT_WEEK_PRESETS = [1, 2, 3, 4, 8, 12] as const;
export const MIN_COMMITMENT_DAYS = 1;
export const MAX_COMMITMENT_DAYS = 365;

export const DEFAULT_WEEKLY_TARGET = 7;
export const MAX_WEEKLY_TARGET = 70;

export function commitmentEnd(c: SoberCommitment): Date {
  return addDays(fromKey(c.start), c.days - 1);
}

/**
 * A new commitment starts today, unless today already has drinks logged — then it
 * starts tomorrow so it isn't broken before it begins.
 */
export function commitmentStartFor(entries: Entries, today: Date): DateKey {
  const count = entries[toKey(today)];
  return count !== undefined && count > 0 ? toKey(addDays(today, 1)) : toKey(today);
}

export type CommitmentStatus = 'upcoming' | 'active' | 'broken' | 'complete';

export interface CommitmentProgress {
  status: CommitmentStatus;
  /** Days of the commitment that have started (today included), 0..days. */
  elapsed: number;
  remaining: number;
  soberDays: number;
  /**
   * Past days (before today) not logged yet. They don't break it, but don't count toward
   * it either. Today isn't counted: it isn't over.
   */
  unloggedDays: number;
  /** First day in the commitment with drinks logged. */
  brokenOn: DateKey | null;
}

/**
 * Only logged sober days count, consistent with "unlogged ≠ sober" elsewhere. A
 * commitment is complete once every day in it is logged sober — so a finished window
 * with gaps stays `active` until they're filled in.
 */
export function commitmentProgress(
  c: SoberCommitment,
  entries: Entries,
  today: Date
): CommitmentProgress {
  const start = fromKey(c.start);
  const sinceStart = daysBetween(start, today);
  const elapsed = Math.min(c.days, Math.max(0, sinceStart + 1));

  let soberDays = 0;
  let unloggedDays = 0;
  let brokenOn: DateKey | null = null;
  for (let i = 0; i < c.days; i++) {
    const key = toKey(addDays(start, i));
    const count = entries[key];
    // Days after today can't be logged in the UI, but count them if they are.
    if (count === undefined) {
      if (i < sinceStart) unloggedDays++;
    } else if (count === 0) soberDays++;
    else if (brokenOn === null) brokenOn = key;
  }

  let status: CommitmentStatus;
  if (brokenOn !== null) status = 'broken';
  else if (soberDays === c.days) status = 'complete';
  else if (elapsed === 0) status = 'upcoming';
  else status = 'active';

  return { status, elapsed, remaining: c.days - elapsed, soberDays, unloggedDays, brokenOn };
}

export function formatDuration(days: number): string {
  if (days % 7 === 0) {
    const w = days / 7;
    return `${w} ${w === 1 ? 'week' : 'weeks'}`;
  }
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

export interface WeekProgress {
  /** Sunday that starts the current week. */
  weekStart: Date;
  drinks: number;
  loggedDays: number;
  /** Days of this week up to and including today (1..7). */
  daysSoFar: number;
}

/** Drinks logged in the current Sunday-start week, through today. */
export function weekProgress(entries: Entries, today: Date): WeekProgress {
  const weekStart = addDays(today, -today.getDay());
  const daysSoFar = today.getDay() + 1;
  let drinks = 0;
  let loggedDays = 0;
  for (let i = 0; i < daysSoFar; i++) {
    const count = entries[toKey(addDays(weekStart, i))];
    if (count === undefined) continue;
    loggedDays++;
    drinks += count;
  }
  return { weekStart, drinks, loggedDays, daysSoFar };
}
