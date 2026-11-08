import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Legend } from '@/components/legend.tsx';
import { formatShortDate, fromKey, MONTH_NAMES, WEEKDAY_SHORT } from '@/lib/dates.ts';
import { bucketFor, weekGrid, type Bucket, type Entries } from '@/lib/stats.ts';
import { space, useTheme } from '@/theme/index.ts';

const MIN_BOX = 14;
const MAX_BOX = 30;
const GAP = 3;
const LABEL_W = 28;

interface Props {
  entries: Entries;
  start: Date;
  end: Date;
  threshold: number;
  orangeFrom: number;
}

/**
 * Calendar heatmap: one row per weekday, one column per week, each box coloured by the
 * day's consumption level. Scrolls horizontally for long ranges, opening on the latest week.
 */
export function WeekdayHeatmap({ entries, start, end, threshold, orangeFrom }: Props) {
  const t = useTheme();
  const scroll = useRef<ScrollView>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const weeks = useMemo(() => weekGrid(entries, start, end), [entries, start, end]);

  const counts = useMemo(() => {
    const c: Partial<Record<Bucket, number>> = {};
    for (const week of weeks)
      for (const cell of week) {
        if (!cell) continue;
        const b = bucketFor(cell.count, threshold, orangeFrom);
        c[b] = (c[b] ?? 0) + 1;
      }
    return c;
  }, [weeks, threshold, orangeFrom]);

  // Label a column with the month that starts in it; the first column gets its own month
  // unless a new month starts right after it, which would make the two labels collide.
  const monthLabels = weeks.map((week, i) => {
    const firstOfMonth = week.find((c) => c && fromKey(c.key).getDate() === 1);
    if (firstOfMonth) return MONTH_NAMES[fromKey(firstOfMonth.key).getMonth()].slice(0, 3);
    if (i > 0) return '';
    const soon = weeks.slice(1, 3).some((w) => w.some((c) => c && fromKey(c.key).getDate() === 1));
    return soon ? '' : MONTH_NAMES[fromKey(week.find((c) => c)!.key).getMonth()].slice(0, 3);
  });

  // Grow boxes to fill the card when few weeks are shown; long ranges scroll at the minimum.
  const [width, setWidth] = useState(0);
  const fit = width ? (width - LABEL_W) / weeks.length - GAP : MIN_BOX;
  const box = Math.max(MIN_BOX, Math.min(MAX_BOX, Math.floor(fit)));
  const boxStyle = { width: box, height: box };

  const sel = selected ? entries[selected] : undefined;
  const readout = selected
    ? `${WEEKDAY_SHORT[fromKey(selected).getDay()]} ${formatShortDate(fromKey(selected))}: ${
        sel === undefined ? 'not logged' : `${sel} drink${sel === 1 ? '' : 's'}`
      }`
    : 'Tap a box to see that day.';

  return (
    <View style={{ gap: space.md }}>
      <Text style={[styles.readout, { color: t.textMuted }]}>{readout}</Text>
      <View style={styles.body} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <View style={[styles.labels, { marginTop: MIN_BOX + GAP }]}>
          {WEEKDAY_SHORT.map((d, i) => (
            <Text
              key={d}
              style={[styles.dayLabel, { height: box, lineHeight: box, color: t.textFaint }]}>
              {i % 2 === 1 ? d : ''}
            </Text>
          ))}
        </View>
        <ScrollView
          ref={scroll}
          horizontal
          showsHorizontalScrollIndicator={false}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
          <View style={styles.columns}>
            {weeks.map((week, wi) => (
              <View key={wi} style={styles.column}>
                <View style={[styles.monthSlot, { width: box }]}>
                  <Text style={[styles.month, { color: t.textFaint }]}>{monthLabels[wi]}</Text>
                </View>
                {week.map((cell, di) => {
                  if (!cell) return <View key={di} style={[styles.box, boxStyle]} />;
                  const bucket = bucketFor(cell.count, threshold, orangeFrom);
                  const active = cell.key === selected;
                  return (
                    <Pressable
                      key={di}
                      hitSlop={2}
                      accessibilityRole="button"
                      accessibilityLabel={`${formatShortDate(fromKey(cell.key))}: ${
                        cell.count === undefined ? 'not logged' : `${cell.count} drinks`
                      }`}
                      onPress={() => setSelected(active ? null : cell.key)}
                      style={[
                        styles.box,
                        boxStyle,
                        {
                          backgroundColor: t.bucket[bucket],
                          borderColor: active ? t.text : 'transparent',
                        },
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
      <View style={[styles.legend, { borderTopColor: t.border }]}>
        <Legend threshold={threshold} orangeFrom={orangeFrom} counts={counts} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { fontSize: 13, minHeight: 18 },
  body: { flexDirection: 'row' },
  labels: { width: LABEL_W, gap: GAP },
  dayLabel: { fontSize: 10, fontWeight: '600' },
  columns: { flexDirection: 'row', gap: GAP },
  column: { gap: GAP },
  monthSlot: { height: MIN_BOX, overflow: 'visible' },
  month: { position: 'absolute', left: 0, width: 40, fontSize: 10, lineHeight: MIN_BOX },
  box: { borderRadius: 3, borderWidth: 1.5, borderColor: 'transparent' },
  legend: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: space.sm,
  },
});
