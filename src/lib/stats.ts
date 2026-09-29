import { addDays, daysBetween, fromKey, toKey, type DateKey } from './dates.ts';

/** Drinks logged per day. A missing key means the day was not logged. */
export type Entries = Record<DateKey, number>;

export type Bucket = 'unlogged' | 'sober' | 'moderate' | 'heavy';

export const DEFAULT_THRESHOLD = 2;
export const MIN_THRESHOLD = 2;
export const MAX_THRESHOLD = 12;

/**
 * Sober = 0 drinks, heavy = at or above the threshold, moderate = anything between.
 * With the default threshold of 2, moderate is exactly one drink.
 */
export function bucketFor(count: number | undefined, threshold: number): Bucket {
  if (count === undefined) return 'unlogged';
  if (count <= 0) return 'sober';
  if (count >= threshold) return 'heavy';
  return 'moderate';
}

export type RangeId = '30d' | '90d' | '1y' | 'all';

export const RANGES: { id: RangeId; label: string; days: number | null }[] = [
  { id: '30d', label: '30D', days: 30 },
  { id: '90d', label: '90D', days: 90 },
  { id: '1y', label: '1Y', days: 365 },
  { id: 'all', label: 'All', days: null },
];

export interface WeekdayStat {
  /** 0 = Sunday */
  weekday: number;
  loggedDays: number;
  average: number;
}

export interface Stats {
  rangeDays: number;
  loggedDays: number;
  totalDrinks: number;
  soberDays: number;
  heavyDays: number;
  /** Averages are over logged days only; unlogged days are unknown, not zero. */
  perDay: number;
  perWeek: number;
  perMonth: number;
  soberRate: number;
  byWeekday: WeekdayStat[];
}

const AVG_DAYS_PER_MONTH = 365.2425 / 12;

export function rangeStart(entries: Entries, range: RangeId, today: Date): Date {
  const def = RANGES.find((r) => r.id === range)!;
  if (def.days !== null) return addDays(today, -(def.days - 1));
  const keys = Object.keys(entries).sort();
  return keys.length ? fromKey(keys[0]) : today;
}

export function computeStats(
  entries: Entries,
  threshold: number,
  range: RangeId,
  today: Date
): Stats {
  const start = rangeStart(entries, range, today);
  const rangeDays = Math.max(1, daysBetween(start, today) + 1);
  const startKey = toKey(start);
  const endKey = toKey(today);

  let loggedDays = 0;
  let totalDrinks = 0;
  let soberDays = 0;
  let heavyDays = 0;
  const wdCount = [0, 0, 0, 0, 0, 0, 0];
  const wdSum = [0, 0, 0, 0, 0, 0, 0];

  for (const [key, count] of Object.entries(entries)) {
    // Lexicographic compare is valid for zero-padded YYYY-MM-DD keys.
    if (key < startKey || key > endKey) continue;
    loggedDays++;
    totalDrinks += count;
    const b = bucketFor(count, threshold);
    if (b === 'sober') soberDays++;
    if (b === 'heavy') heavyDays++;
    const wd = fromKey(key).getDay();
    wdCount[wd]++;
    wdSum[wd] += count;
  }

  const perDay = loggedDays ? totalDrinks / loggedDays : 0;
  return {
    rangeDays,
    loggedDays,
    totalDrinks,
    soberDays,
    heavyDays,
    perDay,
    perWeek: perDay * 7,
    perMonth: perDay * AVG_DAYS_PER_MONTH,
    soberRate: loggedDays ? soberDays / loggedDays : 0,
    byWeekday: wdCount.map((n, weekday) => ({
      weekday,
      loggedDays: n,
      average: n ? wdSum[weekday] / n : 0,
    })),
  };
}

/**
 * Consecutive logged sober days ending today. If today is not logged yet the
 * streak is counted through yesterday, so it doesn't reset every morning.
 */
export function currentSoberStreak(entries: Entries, today: Date): number {
  let day = entries[toKey(today)] === undefined ? addDays(today, -1) : today;
  let streak = 0;
  while (entries[toKey(day)] === 0) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

export function longestSoberStreak(entries: Entries): number {
  const soberKeys = Object.keys(entries)
    .filter((k) => entries[k] === 0)
    .sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of soberKeys) {
    const d = fromKey(key);
    run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}
