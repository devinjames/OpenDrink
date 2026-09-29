/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { missingDays, shouldPromptBackfill } from './backfill.ts';
import { addDays, toKey } from './dates.ts';
import type { Entries } from './stats.ts';

const today = new Date(2026, 8, 29);
const k = (offset: number) => toKey(addDays(today, offset));

test('no history means no prompt', () => {
  assert.deepEqual(missingDays({}, today), []);
  assert.equal(shouldPromptBackfill({}, today, null), false);
});

test('only today logged: nothing before first entry is missing', () => {
  assert.deepEqual(missingDays({ [k(0)]: 0 }, today), []);
});

test('gaps within the window, newest first, today excluded', () => {
  const entries: Entries = { [k(-20)]: 0, [k(-1)]: 1, [k(-4)]: 0 };
  assert.deepEqual(missingDays(entries, today), [k(-2), k(-3), k(-5), k(-6), k(-7)]);
});

test('window starts at first entry when history is short', () => {
  const entries: Entries = { [k(-3)]: 0 };
  assert.deepEqual(missingDays(entries, today), [k(-1), k(-2)]);
});

test('prompt at most once per day', () => {
  const entries: Entries = { [k(-3)]: 0 };
  assert.equal(shouldPromptBackfill(entries, today, null), true);
  assert.equal(shouldPromptBackfill(entries, today, k(-1)), true);
  assert.equal(shouldPromptBackfill(entries, today, k(0)), false);
});

test('fully logged week does not prompt', () => {
  const entries: Entries = {};
  for (let i = 0; i <= 10; i++) entries[k(-i)] = 0;
  assert.equal(shouldPromptBackfill(entries, today, null), false);
});
