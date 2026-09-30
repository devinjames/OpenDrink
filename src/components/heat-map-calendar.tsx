import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card.tsx';
import { Legend } from '@/components/legend.tsx';
import { daysInMonth, MONTH_NAMES, toKey, WEEKDAY_LETTER, type DateKey } from '@/lib/dates.ts';
import { bucketFor, type Entries } from '@/lib/stats.ts';
import { radius, space, useTheme } from '@/theme/index.ts';

interface Props {
  month: Date; // any date within the displayed month
  today: Date;
  entries: Entries;
  threshold: number;
  orangeFrom: number;
  onChangeMonth: (delta: number) => void;
  onSelectDay: (key: DateKey) => void;
}

export function HeatMapCalendar({
  month,
  today,
  entries,
  threshold,
  orangeFrom,
  onChangeMonth,
  onSelectDay,
}: Props) {
  const t = useTheme();
  const year = month.getFullYear();
  const m = month.getMonth();
  const todayKey = toKey(today);
  const isCurrentMonth = year === today.getFullYear() && m === today.getMonth();

  const weeks = useMemo(() => {
    const lead = new Date(year, m, 1).getDay();
    const total = daysInMonth(year, m);
    const cells: (number | null)[] = [
      ...Array<null>(lead).fill(null),
      ...Array.from({ length: total }, (_, i) => i + 1),
    ];
    while (cells.length % 7) cells.push(null);
    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

    return rows;
  }, [year, m]);

  return (
    <Card style={{ gap: GAP, padding: space.md }}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Previous month"
          onPress={() => onChangeMonth(-1)}
          hitSlop={10}
          style={[styles.nav, { backgroundColor: t.cardRaised }]}>
          <Ionicons name="chevron-back" size={16} color={t.text} />
        </Pressable>
        <Text style={[styles.title, { color: t.text }]}>
          {MONTH_NAMES[m]} {year}
        </Text>
        <Pressable
          accessibilityLabel="Next month"
          disabled={isCurrentMonth}
          onPress={() => onChangeMonth(1)}
          hitSlop={10}
          style={[
            styles.nav,
            { backgroundColor: t.cardRaised, opacity: isCurrentMonth ? 0.3 : 1 },
          ]}>
          <Ionicons name="chevron-forward" size={16} color={t.text} />
        </Pressable>
      </View>

      <View style={styles.row}>
        {WEEKDAY_LETTER.map((l, i) => (
          <Text key={i} style={[styles.weekday, { color: t.textFaint }]}>
            {l}
          </Text>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={styles.row}>
          {week.map((day, di) => {
            if (day === null) return <View key={di} style={styles.cell} />;
            const date = new Date(year, m, day);
            const key = toKey(date);
            const future = key > todayKey;
            const count = entries[key];
            const bucket = bucketFor(count, threshold, orangeFrom);
            const filled = bucket !== 'unlogged';
            const isToday = key === todayKey;
            return (
              <Pressable
                key={di}
                disabled={future}
                accessibilityLabel={`${MONTH_NAMES[m]} ${day}: ${
                  count === undefined ? 'not logged' : `${count} drinks`
                }`}
                onPress={() => onSelectDay(key)}
                style={({ pressed }) => [
                  styles.cell,
                  styles.day,
                  {
                    backgroundColor: future ? 'transparent' : t.bucket[bucket],
                    borderColor: isToday ? t.text : 'transparent',
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}>
                <Text
                  style={[
                    styles.dayText,
                    {
                      color: filled ? '#FFFFFF' : future ? t.textFaint : t.textMuted,
                      fontWeight: isToday || filled ? '700' : '500',
                    },
                  ]}>
                  {day}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}

      <View style={[styles.summary, { borderTopColor: t.border }]}>
        <Legend threshold={threshold} orangeFrom={orangeFrom} />
      </View>
    </Card>
  );
}

const GAP = 4;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.xs,
  },
  nav: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', gap: GAP },
  weekday: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600' },
  // Wider than tall keeps six-week months short enough to fit a phone screen.
  cell: { flex: 1, aspectRatio: 1.45 },
  day: {
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { fontSize: 12, fontVariant: ['tabular-nums'] },
  summary: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    paddingTop: space.sm,
    marginTop: space.xs,
  },
});
