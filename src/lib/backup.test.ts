/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { backupFileName, BackupError, createBackup, parseBackup } from './backup.ts';
import { DEFAULT_SETTINGS, type Settings } from './storage.ts';

const settings: Settings = {
  ...DEFAULT_SETTINGS,
  threshold: 4,
  reminderEnabled: true,
  reminderHour: 8,
  reminderMinute: 30,
  lastBackfillPrompt: '2026-09-29',
  commitment: { start: '2026-09-01', days: 28 },
  weeklyTarget: 5,
};
const now = new Date(2026, 8, 30, 12);

test('round-trips entries and portable settings', () => {
  const entries = { '2026-09-28': 0, '2026-09-29': 3 };
  const parsed = parseBackup(createBackup(entries, settings, now));
  assert.deepEqual(parsed.entries, entries);
  assert.deepEqual(parsed.settings, {
    threshold: 4,
    reminderHour: 8,
    reminderMinute: 30,
    commitment: { start: '2026-09-01', days: 28 },
    weeklyTarget: 5,
  });
});

test('an absent commitment and target are restored as cleared', () => {
  const none = { ...settings, commitment: null, weeklyTarget: null };
  const parsed = parseBackup(createBackup({}, none, now));
  assert.equal(parsed.settings.commitment, null);
  assert.equal(parsed.settings.weeklyTarget, null);
});

test('device-specific settings are not written', () => {
  const json = JSON.parse(createBackup({}, settings, now));
  assert.equal('reminderEnabled' in json.settings, false);
  assert.equal('lastBackfillPrompt' in json.settings, false);
});

test('file name uses the local date', () => {
  assert.equal(backupFileName(new Date(2026, 0, 5)), 'opendrink-backup-2026-01-05.json');
});

const wrap = (over: object) =>
  JSON.stringify({ app: 'opendrink-backup', version: 1, entries: {}, settings: {}, ...over });

test('rejects files that are not backups', () => {
  assert.throws(() => parseBackup('not json'), BackupError);
  assert.throws(() => parseBackup('[]'), /not an OpenDrink backup/);
  assert.throws(() => parseBackup('{"entries":{}}'), /not an OpenDrink backup/);
  assert.throws(() => parseBackup(wrap({ version: 2 })), /newer version/);
  assert.throws(() => parseBackup(wrap({ entries: null })), /no entries/);
});

test('rejects malformed entries rather than importing part of the file', () => {
  for (const entries of [
    { '2026-9-1': 1 },
    { '2026-02-31': 1 },
    { '2026-09-01': -1 },
    { '2026-09-01': 1.5 },
    { '2026-09-01': '2' },
    { '2026-09-01': null },
  ]) {
    assert.throws(() => parseBackup(wrap({ entries })), /invalid entry/, JSON.stringify(entries));
  }
});

test('out-of-range or missing settings are dropped, not applied', () => {
  const parsed = parseBackup(
    wrap({
      settings: {
        threshold: 99,
        reminderHour: 25,
        reminderMinute: 0,
        commitment: { start: '2026-02-31', days: 7 },
        weeklyTarget: -1,
      },
    })
  );
  assert.deepEqual(parsed.settings, {});
  assert.deepEqual(parseBackup(wrap({ settings: undefined })).settings, {});
});

test('an out-of-range commitment length is dropped', () => {
  const parsed = parseBackup(wrap({ settings: { commitment: { start: '2026-09-01', days: 0 } } }));
  assert.equal('commitment' in parsed.settings, false);
});
