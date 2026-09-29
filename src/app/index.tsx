import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { DayEditor } from '@/components/day-editor.tsx';
import { HeatMapCalendar } from '@/components/heat-map-calendar.tsx';
import { Screen } from '@/components/screen.tsx';
import { TodayCard } from '@/components/today-card.tsx';
import { useToday } from '@/hooks/use-today.ts';
import { addMonths, toKey, type DateKey } from '@/lib/dates.ts';
import { remindersSupported } from '@/lib/reminders.ts';
import { currentSoberStreak } from '@/lib/stats.ts';
import { useStore } from '@/store/index.tsx';
import { radius, space, useTheme } from '@/theme/index.ts';

export default function TodayScreen() {
  const t = useTheme();
  const today = useToday();
  const { entries, settings, setCount } = useStore();
  const [monthOffset, setMonthOffset] = useState(0);
  const [editing, setEditing] = useState<DateKey | null>(null);

  const todayKey = toKey(today);
  const month = addMonths(today, monthOffset);
  const streak = useMemo(() => currentSoberStreak(entries, today), [entries, today]);

  return (
    <Screen title="OpenDrink">
      <TodayCard
        today={today}
        count={entries[todayKey]}
        threshold={settings.threshold}
        streak={streak}
        onChange={(c) => setCount(todayKey, c)}
      />

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
        onChangeMonth={(d) => setMonthOffset((o) => Math.min(0, o + d))}
        onSelectDay={setEditing}
      />

      <DayEditor
        day={editing}
        count={editing ? entries[editing] : undefined}
        threshold={settings.threshold}
        onClose={() => setEditing(null)}
        onSave={(c) => {
          if (editing) setCount(editing, c);
          setEditing(null);
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
