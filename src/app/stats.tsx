import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card.tsx';
import { Screen, SectionLabel } from '@/components/screen.tsx';
import { Segmented } from '@/components/segmented.tsx';
import { StatTile } from '@/components/stat-tile.tsx';
import { WeekdayChart } from '@/components/weekday-chart.tsx';
import { useToday } from '@/hooks/use-today.ts';
import {
  computeStats,
  currentSoberStreak,
  longestSoberStreak,
  RANGES,
  type RangeId,
} from '@/lib/stats.ts';
import { useStore } from '@/store/index.tsx';
import { space, useTheme } from '@/theme/index.ts';

const fmt = (n: number) => (n >= 10 ? n.toFixed(0) : n.toFixed(1));

export default function StatsScreen() {
  const t = useTheme();
  const today = useToday();
  const { entries, settings } = useStore();
  const [range, setRange] = useState<RangeId>('30d');

  const stats = useMemo(
    () => computeStats(entries, settings.threshold, range, today),
    [entries, settings.threshold, range, today]
  );
  const streak = useMemo(() => currentSoberStreak(entries, today), [entries, today]);
  const longest = useMemo(() => longestSoberStreak(entries), [entries]);

  return (
    <Screen title="Statistics">
      <Segmented options={RANGES} value={range} onChange={setRange} />

      <Text style={[styles.coverage, { color: t.textMuted }]}>
        {stats.loggedDays} of {stats.rangeDays} days logged · averages use logged days only
      </Text>

      <SectionLabel>Average drinks</SectionLabel>
      <View style={styles.grid}>
        <StatTile label="Per day" value={fmt(stats.perDay)} />
        <StatTile label="Per week" value={fmt(stats.perWeek)} />
        <StatTile label="Per month" value={fmt(stats.perMonth)} />
        <StatTile
          label="Sober days"
          value={`${Math.round(stats.soberRate * 100)}`}
          unit="%"
          hint={`${stats.soberDays} of ${stats.loggedDays} logged`}
        />
      </View>

      <SectionLabel>By day of week</SectionLabel>
      <Card>
        <WeekdayChart data={stats.byWeekday} />
      </Card>

      <SectionLabel>Streaks & totals</SectionLabel>
      <View style={styles.grid}>
        <StatTile
          label="Current sober streak"
          value={`${streak}`}
          unit={streak === 1 ? 'day' : 'days'}
        />
        <StatTile
          label="Longest sober streak"
          value={`${longest}`}
          unit={longest === 1 ? 'day' : 'days'}
        />
        <StatTile label="Total drinks" value={`${stats.totalDrinks}`} />
        <StatTile
          label={`Days at ${settings.threshold}+`}
          value={`${stats.heavyDays}`}
          hint="At or above your limit"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  coverage: { fontSize: 13, textAlign: 'center', marginTop: -space.sm },
});
