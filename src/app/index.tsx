import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BackfillSheet } from '@/components/backfill-sheet.tsx';
import { DayEditor } from '@/components/day-editor.tsx';
import { HeatMapCalendar } from '@/components/heat-map-calendar.tsx';
import { MonthStats } from '@/components/month-stats.tsx';
import { Screen } from '@/components/screen.tsx';
import { CommitmentPane } from '@/components/commitment-pane.tsx';
import { TodayCard } from '@/components/today-card.tsx';
import { useToday } from '@/hooks/use-today.ts';
import { missingDays, shouldPromptBackfill } from '@/lib/backfill.ts';
import { addMonths, formatLongDate, fromKey, toKey, type DateKey } from '@/lib/dates.ts';
import { remindersSupported } from '@/lib/reminders.ts';
import { currentSoberStreak } from '@/lib/stats.ts';
import { useStore } from '@/store/index.tsx';
import { radius, space, useTheme } from '@/theme/index.ts';

export default function TodayScreen() {
  const t = useTheme();
  const today = useToday();
  const { ready, entries, settings, setCount, importEntries, updateSettings } = useStore();
  // Set by the notification bridge: `edit` opens a day, `loggedSober` confirms a quick-log.
  const params = useLocalSearchParams<{ edit?: string; loggedSober?: string }>();
  const [monthOffset, setMonthOffset] = useState(0);
  const [editingLocal, setEditing] = useState<DateKey | null>(null);
  // Wait for hydration so the editor never starts from a not-yet-loaded (empty) day.
  const editing = ready ? (editingLocal ?? params.edit ?? null) : null;

  const todayKey = toKey(today);
  const month = addMonths(today, monthOffset);
  const streak = useMemo(() => currentSoberStreak(entries, today), [entries, today]);

  const backfillDays = useMemo(() => missingDays(entries, today), [entries, today]);
  const showBackfill =
    ready && editing === null && shouldPromptBackfill(entries, today, settings.lastBackfillPrompt);
  const closeBackfill = () => updateSettings({ lastBackfillPrompt: todayKey });

  const closeEditor = () => {
    setEditing(null);
    if (params.edit) router.setParams({ edit: undefined });
  };

  useEffect(() => {
    if (!params.loggedSober) return;
    const timer = setTimeout(() => router.setParams({ loggedSober: undefined }), 4000);
    return () => clearTimeout(timer);
  }, [params.loggedSober]);

  return (
    <Screen>
      {params.loggedSober ? (
        <View style={[styles.banner, { backgroundColor: t.bucket.sober }]}>
          <Ionicons name="leaf" size={18} color="#FFFFFF" />
          <Text style={[styles.bannerText, { color: '#FFFFFF' }]}>
            Logged {formatLongDate(fromKey(params.loggedSober))} as a sober day.
          </Text>
        </View>
      ) : null}

      <TodayCard
        today={today}
        count={entries[todayKey]}
        threshold={settings.threshold}
        orangeFrom={settings.orangeFrom}
        streak={streak}
        onChange={(c) => setCount(todayKey, c)}
      />

      {settings.commitment ? (
        <CommitmentPane
          commitment={settings.commitment}
          entries={entries}
          today={today}
          threshold={settings.threshold}
          orangeFrom={settings.orangeFrom}
        />
      ) : null}

      {remindersSupported && !settings.reminderEnabled ? (
        <Pressable
          onPress={() => router.navigate('/settings')}
          style={[styles.banner, { backgroundColor: t.accentSoft }]}>
          <Ionicons name="notifications-outline" size={18} color={t.accent} />
          <Text style={[styles.bannerText, { color: t.text }]}>
            Turn on a daily reminder so you never miss a day.
          </Text>
          <Ionicons name="chevron-forward" size={16} color={t.accent} />
        </Pressable>
      ) : null}

      <HeatMapCalendar
        month={month}
        today={today}
        entries={entries}
        threshold={settings.threshold}
        orangeFrom={settings.orangeFrom}
        onChangeMonth={(d) => setMonthOffset((o) => Math.min(0, o + d))}
        onSelectDay={setEditing}
      />

      <MonthStats
        month={month}
        today={today}
        entries={entries}
        threshold={settings.threshold}
        orangeFrom={settings.orangeFrom}
      />

      <DayEditor
        day={editing}
        count={editing ? entries[editing] : undefined}
        threshold={settings.threshold}
        orangeFrom={settings.orangeFrom}
        onClose={closeEditor}
        onSave={(c) => {
          if (editing) setCount(editing, c);
          closeEditor();
        }}
      />

      <BackfillSheet
        visible={showBackfill}
        days={backfillDays}
        threshold={settings.threshold}
        orangeFrom={settings.orangeFrom}
        onDismiss={closeBackfill}
        onSave={(values) => {
          importEntries(values);
          closeBackfill();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
  },
  bannerText: { flex: 1, fontSize: 14, fontWeight: '500' },
});
