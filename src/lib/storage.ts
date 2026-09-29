import AsyncStorage from '@react-native-async-storage/async-storage';

import type { DateKey } from './dates.ts';
import { DEFAULT_THRESHOLD, type Entries } from './stats.ts';

const STORAGE_KEY = 'opendrink:v1';

export interface Settings {
  threshold: number;
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  /** Day the backfill prompt was last shown, so it appears at most once a day. */
  lastBackfillPrompt: DateKey | null;
}

export interface PersistedState {
  version: 1;
  entries: Entries;
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  threshold: DEFAULT_THRESHOLD,
  reminderEnabled: false,
  reminderHour: 21,
  reminderMinute: 0,
  lastBackfillPrompt: null,
};

export async function loadState(): Promise<PersistedState> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const parsed = raw ? (JSON.parse(raw) as Partial<PersistedState>) : {};
  return {
    version: 1,
    entries: parsed.entries ?? {},
    settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
  };
}

export async function saveState(state: PersistedState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * When the React store is mounted and hydrated it registers itself here, so writes that
 * originate outside React (notification actions) go through its state instead of racing
 * its own saves to disk. When it isn't mounted (e.g. a headless Android task), writes go
 * straight to storage and the store picks them up on its next load.
 */
export interface LiveStore {
  getEntries: () => Entries;
  setCount: (day: DateKey, count: number | null) => void;
}

let live: LiveStore | null = null;

export function registerLiveStore(store: LiveStore | null) {
  live = store;
}

export type QuickLogResult = 'logged' | 'already-logged';

/** Marks `day` sober only if it hasn't been logged; never overwrites an existing entry. */
export async function logSoberIfUnlogged(day: DateKey): Promise<QuickLogResult> {
  if (live) {
    if (live.getEntries()[day] !== undefined) return 'already-logged';
    live.setCount(day, 0);
    return 'logged';
  }
  const state = await loadState();
  if (state.entries[day] !== undefined) return 'already-logged';
  state.entries[day] = 0;
  await saveState(state);
  return 'logged';
}
