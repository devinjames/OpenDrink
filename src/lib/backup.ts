import { MAX_COMMITMENT_DAYS, MAX_WEEKLY_TARGET, MIN_COMMITMENT_DAYS } from './commitments.ts';
import { toKey } from './dates.ts';
import {
  DEFAULT_ORANGE_FROM,
  MAX_THRESHOLD,
  MIN_ORANGE_FROM,
  normalizeLimits,
  type Entries,
} from './stats.ts';
import type { Settings } from './storage.ts';

const APP_MARKER = 'opendrink-backup';
const BACKUP_VERSION = 1;

/**
 * Settings worth carrying to another device. `reminderEnabled` is left out because the
 * notification permission it depends on is per-device, and `lastBackfillPrompt` is
 * per-device bookkeeping.
 */
export type BackupSettings = Pick<
  Settings,
  'threshold' | 'orangeFrom' | 'reminderHour' | 'reminderMinute' | 'commitment' | 'weeklyTarget'
>;

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
      orangeFrom: settings.orangeFrom,
      reminderHour: settings.reminderHour,
      reminderMinute: settings.reminderMinute,
      commitment: settings.commitment,
      weeklyTarget: settings.weeklyTarget,
    },
  };
  return JSON.stringify(backup, null, 2) + '\n';
}

export function backupFileName(today: Date): string {
  return `opendrink-backup-${toKey(today)}.json`;
}

export class BackupError extends Error {}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Rejects malformed keys and impossible dates like 2026-02-31 by round-tripping. */
function isDayKey(v: unknown): v is string {
  if (typeof v !== 'string' || !DAY_KEY.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  return toKey(new Date(y, m - 1, d)) === v;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isIntIn = (v: unknown, min: number, max: number): v is number =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

/**
 * Parses and validates a backup file. Throws `BackupError` with a user-facing message if
 * the file isn't an OpenDrink backup or contains anything malformed; nothing is partially
 * accepted. Missing or out-of-range settings are left out so the caller keeps its own.
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
    if (!isDayKey(day) || !isIntIn(count, 0, 999)) {
      throw new BackupError(`The backup has an invalid entry for "${day}".`);
    }
    entries[day] = count;
  }

  const s = isObject(data.settings) ? data.settings : {};
  const settings: Partial<BackupSettings> = {};
  // Backups from before the colour ranges have a threshold (as low as 2) and no orangeFrom;
  // normalizeLimits raises it to the current minimum.
  if (isIntIn(s.threshold, 2, MAX_THRESHOLD)) {
    const orangeFrom = isIntIn(s.orangeFrom, MIN_ORANGE_FROM, MAX_THRESHOLD)
      ? s.orangeFrom
      : DEFAULT_ORANGE_FROM;
    Object.assign(settings, normalizeLimits(s.threshold, orangeFrom));
  }
  if (isIntIn(s.reminderHour, 0, 23) && isIntIn(s.reminderMinute, 0, 59)) {
    settings.reminderHour = s.reminderHour;
    settings.reminderMinute = s.reminderMinute;
  }
  // `null` is meaningful here (no commitment / no target), so it is restored too.
  const c = s.commitment;
  if (c === null) settings.commitment = null;
  else if (
    isObject(c) &&
    isDayKey(c.start) &&
    isIntIn(c.days, MIN_COMMITMENT_DAYS, MAX_COMMITMENT_DAYS)
  ) {
    settings.commitment = { start: c.start, days: c.days };
  }
  if (s.weeklyTarget === null || isIntIn(s.weeklyTarget, 0, MAX_WEEKLY_TARGET)) {
    settings.weeklyTarget = s.weeklyTarget;
  }
  return { entries, settings };
}
