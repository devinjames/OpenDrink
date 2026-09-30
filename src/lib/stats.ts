import { addDays, daysBetween, fromKey, toKey, type DateKey } from './dates.ts';

/** Drinks logged per day. A missing key means the day was not logged. */
export type Entries = Record<DateKey, number>;

/** `low` is shown blue, `moderate` orange and `heavy` red. */
export type Bucket = 'unlogged' | 'sober' | 'low' | 'moderate' | 'heavy';

/** `threshold` is the first drink count that is red; it is the top of the orange range + 1. */
export const DEFAULT_THRESHOLD = 3;
export const MIN_THRESHOLD = 3;
export const MAX_THRESHOLD = 12;
/** `orangeFrom` is the first drink count that is orange; blue covers 1 up to just below it. */
export const DEFAULT_ORANGE_FROM = 2;
export const MIN_ORANGE_FROM = 2;

/**
 * Keeps the colour ranges ordered and non-overlapping: blue is 1..orangeFrom-1, orange is
 * orangeFrom..threshold-1 and red is threshold and up. Every range holds at least one count.
 */
export function normalizeLimits(
  threshold: number,
  orangeFrom: number
): { threshold: number; orangeFrom: number } {
  const red = Math.min(MAX_THRESHOLD, Math.max(MIN_THRESHOLD, threshold));
  return { threshold: red, orangeFrom: Math.min(red - 1, Math.max(MIN_ORANGE_FROM, orangeFrom)) };
}

/** Sober = 0 drinks, then blue, orange and red as set by `orangeFrom` and `threshold`. */
export function bucketFor(
  count: number | undefined,
  threshold: number,
  orangeFrom: number
): Bucket {
  if (count === undefined) return 'unlogged';
  if (count <= 0) return 'sober';
  if (count >= threshold) return 'heavy';
  if (count >= orangeFrom) return 'moderate';
  return 'low';
}

export type RangeId = '7d' | '30d' | '90d' | '1y' | 'all';

export const RANGES: { id: RangeId; label: string; days: number | null }[] = [
  { id: '7d', label: '7D', days: 7 },
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
  return computeStatsBetween(entries, threshold, rangeStart(entries, range, today), today);
}

/** Stats for the inclusive span `start`..`end`; days outside it are ignored. */
export function computeStatsBetween(
  entries: Entries,
  threshold: number,
  start: Date,
  end: Date
): Stats {
  const rangeDays = Math.max(1, daysBetween(start, end) + 1);
  const startKey = toKey(start);
  const endKey = toKey(end);

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
    if (count === 0) soberDays++;
    if (count >= threshold) heavyDays++;
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

export interface DailyPoint {
  key: DateKey;
  /** Drinks that day, or null when the day was not logged. */
  count: number | null;
  /** Running total of drinks from the start of the range through this day. */
  cumulative: number;
}

/** One point per calendar day in the range, oldest first. */
export function dailySeries(entries: Entries, range: RangeId, today: Date): DailyPoint[] {
  const start = rangeStart(entries, range, today);
  const days = Math.max(1, daysBetween(start, today) + 1);
  const out: DailyPoint[] = [];
  let cumulative = 0;
  for (let i = 0; i < days; i++) {
    const key = toKey(addDays(start, i));
    const count = entries[key] ?? null;
    cumulative += count ?? 0;
    out.push({ key, count, cumulative });
  }
  return out;
}
