/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  commitmentEnd,
  commitmentProgress,
  commitmentStartFor,
  formatDuration,
  weekProgress,
} from './commitments.ts';
import { addDays, toKey } from './dates.ts';
import type { Entries } from './stats.ts';

// Tuesday, 29 Sep 2026
const today = new Date(2026, 8, 29);
const k = (offset: number) => toKey(addDays(today, offset));

test('start is today unless today already has drinks', () => {
  assert.equal(commitmentStartFor({}, today), k(0));
  assert.equal(commitmentStartFor({ [k(0)]: 0 }, today), k(0));
  assert.equal(commitmentStartFor({ [k(0)]: 2 }, today), k(1));
});

test('end date is inclusive', () => {
  assert.equal(toKey(commitmentEnd({ start: k(0), days: 14 })), k(13));
});

test('active commitment counts logged sober days and unlogged gaps', () => {
  const c = { start: k(-3), days: 14 };
  const p = commitmentProgress(c, { [k(-3)]: 0, [k(-2)]: 0, [k(0)]: 0 }, today);
  assert.equal(p.status, 'active');
  assert.equal(p.elapsed, 4);
  assert.equal(p.remaining, 10);
  assert.equal(p.soberDays, 3);
  assert.equal(p.unloggedDays, 1);
  assert.equal(p.brokenOn, null);
});

test('today being unlogged is not a gap', () => {
  const p = commitmentProgress({ start: k(-1), days: 7 }, { [k(-1)]: 0 }, today);
  assert.equal(p.elapsed, 2);
  assert.equal(p.unloggedDays, 0);
});

test('upcoming before start', () => {
  const p = commitmentProgress({ start: k(1), days: 7 }, {}, today);
  assert.equal(p.status, 'upcoming');
  assert.equal(p.elapsed, 0);
  assert.equal(p.unloggedDays, 0);
});

test('a drink day breaks it and records the first one', () => {
  const c = { start: k(-5), days: 7 };
  const entries: Entries = { [k(-5)]: 0, [k(-4)]: 1, [k(-2)]: 3 };
  const p = commitmentProgress(c, entries, today);
  assert.equal(p.status, 'broken');
  assert.equal(p.brokenOn, k(-4));
});

test('ignores days outside the window', () => {
  const c = { start: k(-1), days: 2 };
  const p = commitmentProgress(c, { [k(-2)]: 5, [k(-1)]: 0, [k(0)]: 0, [k(1)]: 4 }, today);
  assert.equal(p.status, 'complete');
});

test('finished window with gaps stays active until filled in', () => {
  const c = { start: k(-9), days: 7 };
  const entries: Entries = {};
  for (let i = -9; i <= -4; i++) entries[k(i)] = 0;
  const p = commitmentProgress(c, entries, today);
  assert.equal(p.status, 'active');
  assert.equal(p.elapsed, 7);
  assert.equal(p.remaining, 0);
  assert.equal(p.unloggedDays, 1);
  assert.equal(commitmentProgress(c, { ...entries, [k(-3)]: 0 }, today).status, 'complete');
});

test('formatDuration prefers weeks', () => {
  assert.equal(formatDuration(7), '1 week');
  assert.equal(formatDuration(28), '4 weeks');
  assert.equal(formatDuration(10), '10 days');
  assert.equal(formatDuration(1), '1 day');
});

test('week progress sums Sunday through today', () => {
  // today is Tuesday: Sun k(-2), Mon k(-1), Tue k(0); Sat k(-3) is last week
  const entries: Entries = { [k(-3)]: 9, [k(-2)]: 2, [k(0)]: 1 };
  const w = weekProgress(entries, today);
  assert.equal(toKey(w.weekStart), k(-2));
  assert.equal(w.drinks, 3);
  assert.equal(w.loggedDays, 2);
  assert.equal(w.daysSoFar, 3);
});
