import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { DateKey } from '@/lib/dates.ts';
import { cancelDailyReminder, scheduleDailyReminder } from '@/lib/reminders.ts';
import { DEFAULT_THRESHOLD, type Entries } from '@/lib/stats.ts';

const STORAGE_KEY = 'opendrink:v1';

export interface Settings {
  threshold: number;
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
}

interface PersistedState {
  version: 1;
  entries: Entries;
  settings: Settings;
}

const DEFAULT_SETTINGS: Settings = {
  threshold: DEFAULT_THRESHOLD,
  reminderEnabled: false,
  reminderHour: 21,
  reminderMinute: 0,
};

interface Store {
  ready: boolean;
  entries: Entries;
  settings: Settings;
  /** `null` clears the day back to unlogged. */
  setCount: (day: DateKey, count: number | null) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetAll: () => void;
  /** Merge a batch of entries (e.g. sample data); existing days are overwritten. */
  importEntries: (batch: Entries) => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [entries, setEntries] = useState<Entries>({});
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const hydrated = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        setEntries(parsed.entries ?? {});
        setSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
      })
      .catch((e) => console.warn('Failed to load data', e))
      .finally(() => {
        hydrated.current = true;
        setReady(true);
      });
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    const state: PersistedState = { version: 1, entries, settings };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch((e) =>
      console.warn('Failed to save data', e)
    );
  }, [entries, settings]);

  // Keep the OS schedule in sync with settings (also re-arms after reinstall/restore).
  const { reminderEnabled, reminderHour, reminderMinute } = settings;
  useEffect(() => {
    if (!ready) return;
    const sync = reminderEnabled
      ? scheduleDailyReminder(reminderHour, reminderMinute)
      : cancelDailyReminder();
    sync.catch((e) => console.warn('Failed to update reminder', e));
  }, [ready, reminderEnabled, reminderHour, reminderMinute]);

  const setCount = useCallback((day: DateKey, count: number | null) => {
    setEntries((prev) => {
      const next = { ...prev };
      if (count === null) delete next[day];
      else next[day] = Math.max(0, Math.round(count));
      return next;
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetAll = useCallback(() => {
    setEntries({});
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const importEntries = useCallback((batch: Entries) => {
    setEntries((prev) => ({ ...prev, ...batch }));
  }, []);

  const value = useMemo(
    () => ({ ready, entries, settings, setCount, updateSettings, resetAll, importEntries }),
    [ready, entries, settings, setCount, updateSettings, resetAll, importEntries]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
