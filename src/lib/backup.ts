import { toKey } from './dates.ts';
import { MAX_THRESHOLD, MIN_THRESHOLD, type Entries } from './stats.ts';
import type { Settings } from './storage.ts';

const APP_MARKER = 'opendrink-backup';
const BACKUP_VERSION = 1;

/**
 * Settings worth carrying to another device. `reminderEnabled` is left out because the
 * notification permission it depends on is per-device, and `lastBackfillPrompt` is
 * per-device bookkeeping.
 */
export type BackupSettings = Pick<Settings, 'threshold' | 'reminderHour' | 'reminderMinute'>;

export interface Backup {
  app: typeof APP_MARKER;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  entries: Entries;
  settings: BackupSettings;
}

export function createBackup(entries: Entries, settings: Settings, now: Date): string {
  const backup: Backup = {
    app: APP_MARKER,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    entries,
    settings: {
      threshold: settings.threshold,
      reminderHour: settings.reminderHour,
      reminderMinute: settings.reminderMinute,
    },
  };
  return JSON.stringify(backup, null, 2) + '\n';
}

export function backupFileName(today: Date): string {
  return `opendrink-backup-${toKey(today)}.json`;
}

export class BackupError extends Error {}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isIntIn = (v: unknown, min: number, max: number): v is number =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

/**
 * Parses and validates a backup file. Throws `BackupError` with a user-facing message if
 * the file isn't an OpenDrink backup or contains anything malformed; nothing is partially
 * accepted. Missing settings fall back to `undefined` so the caller keeps its own.
 */
export function parseBackup(text: string): {
  entries: Entries;
  settings: Partial<BackupSettings>;
} {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('This file is not valid JSON.');
  }
  if (!isObject(data) || data.app !== APP_MARKER) {
    throw new BackupError('This file is not an OpenDrink backup.');
  }
  if (data.version !== BACKUP_VERSION) {
    throw new BackupError(
      'This backup was made by a newer version of OpenDrink. Update the app and try again.'
    );
  }
  if (!isObject(data.entries)) throw new BackupError('The backup has no entries.');

  const entries: Entries = {};
  for (const [day, count] of Object.entries(data.entries)) {
    // Round-tripping through toKey rejects impossible dates like 2026-02-31.
    const [y, m, d] = day.split('-').map(Number);
    const valid = DAY_KEY.test(day) && toKey(new Date(y, m - 1, d)) === day;
    if (!valid || !isIntIn(count, 0, 999)) {
      throw new BackupError(`The backup has an invalid entry for "${day}".`);
    }
    entries[day] = count;
  }

  const s = isObject(data.settings) ? data.settings : {};
  const settings: Partial<BackupSettings> = {};
  if (isIntIn(s.threshold, MIN_THRESHOLD, MAX_THRESHOLD)) settings.threshold = s.threshold;
  if (isIntIn(s.reminderHour, 0, 23) && isIntIn(s.reminderMinute, 0, 59)) {
    settings.reminderHour = s.reminderHour;
    settings.reminderMinute = s.reminderMinute;
  }
  return { entries, settings };
}
