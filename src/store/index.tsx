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
import type { Entries } from '@/lib/stats.ts';
import {
  DEFAULT_SETTINGS,
  loadState,
  registerLiveStore,
  saveState,
  type Settings,
} from '@/lib/storage.ts';

export type { Settings };

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
    loadState()
      .then((state) => {
        setEntries(state.entries);
        setSettings(state.settings);
      })
      .catch((e) => console.warn('Failed to load data', e))
      .finally(() => {
        hydrated.current = true;
        setReady(true);
      });
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    saveState({ version: 1, entries, settings }).catch((e) =>
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

  // Expose live state to notification-action handlers once hydrated.
  const entriesRef = useRef(entries);
  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);
  useEffect(() => {
    if (!ready) return;
    registerLiveStore({ getEntries: () => entriesRef.current, setCount });
    return () => registerLiveStore(null);
  }, [ready, setCount]);

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
