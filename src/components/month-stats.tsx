import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card.tsx';
import { MONTH_NAMES, WEEKDAY_LETTER } from '@/lib/dates.ts';
import { bucketFor, computeStatsBetween, type Entries } from '@/lib/stats.ts';
import { radius, space, useTheme } from '@/theme/index.ts';

interface Props {
  month: Date; // any date within the displayed month
  today: Date;
  entries: Entries;
  threshold: number;
  orangeFrom: number;
}

/**
 * One row for the month shown on the calendar: the average drinks per day, then a heat map
 * of the average for each weekday, coloured by the user's colour limits.
 */
export function MonthStats({ month, today, entries, threshold, orangeFrom }: Props) {
  const t = useTheme();
  const year = month.getFullYear();
  const m = month.getMonth();

  const stats = useMemo(() => {
    const start = new Date(year, m, 1);
    const lastDay = new Date(year, m + 1, 0);
    return computeStatsBetween(entries, threshold, start, lastDay < today ? lastDay : today);
  }, [year, m, entries, threshold, today]);

  return (
    <Card style={styles.card}>
      <View
        style={styles.average}
        accessibilityLabel={`${MONTH_NAMES[m]} average per day: ${
          stats.loggedDays ? stats.perDay.toFixed(1) : 'no data'
        }`}>
        <Text style={[styles.label, { color: t.textMuted }]}>Avg/day</Text>
        <Text style={[styles.value, { color: t.text }]}>
          {stats.loggedDays ? stats.perDay.toFixed(1) : '–'}
        </Text>
      </View>
      <View style={styles.cells}>
        {stats.byWeekday.map((d) => {
          const bucket = bucketFor(d.loggedDays ? d.average : undefined, threshold, orangeFrom);
          const filled = bucket !== 'unlogged';
          return (
            <View
              key={d.weekday}
              accessibilityLabel={`${WEEKDAY_LETTER[d.weekday]}: ${
                filled ? `${d.average.toFixed(1)} drinks on average` : 'not logged'
              }`}
              style={[styles.cell, { backgroundColor: t.bucket[bucket] }]}>
              <Text style={[styles.letter, { color: filled ? '#FFFFFF' : t.textFaint }]}>
                {WEEKDAY_LETTER[d.weekday]}
              </Text>
              <Text style={[styles.cellValue, { color: filled ? '#FFFFFF' : t.textFaint }]}>
                {filled ? d.average.toFixed(1) : '–'}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  average: { minWidth: 52 },
  label: { fontSize: 11, fontWeight: '600' },
  value: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  cells: { flex: 1, flexDirection: 'row', gap: 4 },
  cell: {
    flex: 1,
    height: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: { fontSize: 10, fontWeight: '600', opacity: 0.85 },
  cellValue: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
