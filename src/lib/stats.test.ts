/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { addDays, toKey } from './dates.ts';
import {
  bucketFor,
  computeStats,
  dailySeries,
  currentSoberStreak,
  longestSoberStreak,
  normalizeLimits,
  type Entries,
} from './stats.ts';

// Tuesday, 29 Sep 2026
const today = new Date(2026, 8, 29);
const k = (offset: number) => toKey(addDays(today, offset));

test('bucketFor with the default limits: blue 1, orange 2, red 3+', () => {
  assert.equal(bucketFor(undefined, 3, 2), 'unlogged');
  assert.equal(bucketFor(0, 3, 2), 'sober');
  assert.equal(bucketFor(1, 3, 2), 'low');
  assert.equal(bucketFor(2, 3, 2), 'moderate');
  assert.equal(bucketFor(3, 3, 2), 'heavy');
  assert.equal(bucketFor(7, 3, 2), 'heavy');
});

test('bucketFor ranges never overlap and cover every count', () => {
  // blue 1-3, orange 4-5, red 6+
  const buckets = [1, 2, 3, 4, 5, 6, 7].map((n) => bucketFor(n, 6, 4));
  assert.deepEqual(buckets, ['low', 'low', 'low', 'moderate', 'moderate', 'heavy', 'heavy']);
});

test('normalizeLimits keeps ranges ordered with at least one count each', () => {
  assert.deepEqual(normalizeLimits(2, 2), { threshold: 3, orangeFrom: 2 });
  assert.deepEqual(normalizeLimits(5, 9), { threshold: 5, orangeFrom: 4 });
  assert.deepEqual(normalizeLimits(6, 1), { threshold: 6, orangeFrom: 2 });
  assert.deepEqual(normalizeLimits(99, 4), { threshold: 12, orangeFrom: 4 });
});

test('averages ignore unlogged days', () => {
  const entries: Entries = { [k(0)]: 3, [k(-1)]: 0, [k(-5)]: 1 };
  const s = computeStats(entries, 2, '30d', today);
  assert.equal(s.loggedDays, 3);
  assert.equal(s.totalDrinks, 4);
  assert.equal(s.perDay, 4 / 3);
  assert.equal(s.perWeek, (4 / 3) * 7);
  assert.ok(Math.abs(s.perMonth - (4 / 3) * 30.436875) < 1e-9);
  assert.equal(s.soberDays, 1);
  assert.equal(s.heavyDays, 1);
  assert.equal(s.rangeDays, 30);
});

test('range excludes entries outside window and in the future', () => {
  const entries: Entries = { [k(-29)]: 2, [k(-30)]: 10, [k(1)]: 10 };
  const s = computeStats(entries, 2, '30d', today);
  assert.equal(s.loggedDays, 1);
  assert.equal(s.totalDrinks, 2);
});

test('7d range covers today and the previous six days', () => {
  const entries: Entries = { [k(-6)]: 2, [k(-7)]: 10, [k(0)]: 1 };
  const s = computeStats(entries, 2, '7d', today);
  assert.equal(s.rangeDays, 7);
  assert.equal(s.loggedDays, 2);
  assert.equal(s.totalDrinks, 3);
});

test('"all" range starts at earliest entry', () => {
  const entries: Entries = { [k(-99)]: 1, [k(0)]: 1 };
  const s = computeStats(entries, 2, 'all', today);
  assert.equal(s.rangeDays, 100);
});

test('per day-of-week averages', () => {
  // today is Tuesday (2); -7 is also Tuesday; -1 is Monday
  const entries: Entries = { [k(0)]: 2, [k(-7)]: 4, [k(-1)]: 1 };
  const s = computeStats(entries, 2, '30d', today);
  assert.equal(s.byWeekday[2].average, 3);
  assert.equal(s.byWeekday[2].loggedDays, 2);
  assert.equal(s.byWeekday[1].average, 1);
  assert.equal(s.byWeekday[0].loggedDays, 0);
});

test('empty data yields zeros, not NaN', () => {
  const s = computeStats({}, 2, 'all', today);
  assert.equal(s.perDay, 0);
  assert.equal(s.soberRate, 0);
});

test('current streak tolerates unlogged today and stops at gaps', () => {
  const entries: Entries = { [k(-1)]: 0, [k(-2)]: 0, [k(-4)]: 0 };
  assert.equal(currentSoberStreak(entries, today), 2);
  assert.equal(currentSoberStreak({ ...entries, [k(0)]: 0 }, today), 3);
  assert.equal(currentSoberStreak({ ...entries, [k(0)]: 1 }, today), 0);
});

test('longest streak across month boundary', () => {
  const start = new Date(2026, 0, 30);
  const entries: Entries = {};
  for (let i = 0; i < 5; i++) entries[toKey(addDays(start, i))] = 0;
  entries[toKey(addDays(start, 6))] = 0;
  assert.equal(longestSoberStreak(entries), 5);
});

test('dailySeries has one point per day with a running total', () => {
  const entries: Entries = { [k(-2)]: 3, [k(0)]: 1 };
  const series = dailySeries(entries, '30d', today);
  assert.equal(series.length, 30);
  const last3 = series.slice(-3);
  assert.deepEqual(
    last3.map((p) => [p.count, p.cumulative]),
    [
      [3, 3],
      [null, 3],
      [1, 4],
    ]
  );
  assert.equal(series.at(-1)!.key, k(0));
});
