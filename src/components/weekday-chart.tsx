import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { WEEKDAY_SHORT } from '@/lib/dates.ts';
import type { WeekdayStat } from '@/lib/stats.ts';
import { space, useTheme } from '@/theme/index.ts';

const CHART_HEIGHT = 140;

/** Single-series bar chart of average drinks per weekday. Tap a bar for its detail. */
export function WeekdayChart({ data }: { data: WeekdayStat[] }) {
  const t = useTheme();
  const [selected, setSelected] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.average), 0);
  const peak = max > 0 ? data.findIndex((d) => d.average === max) : -1;
  const focus = selected ?? peak;
  const focused = focus >= 0 ? data[focus] : null;

  return (
    <View style={{ gap: space.md }}>
      <Text style={[styles.readout, { color: t.textMuted }]}>
        {focused
          ? `${WEEKDAY_SHORT[focused.weekday]}: ${focused.average.toFixed(1)} avg · ${
              focused.loggedDays
            } day${focused.loggedDays === 1 ? '' : 's'} logged${
              selected === null ? ' (highest)' : ''
            }`
          : 'Log a few days to see your weekly pattern.'}
      </Text>
      <View style={[styles.plot, { borderBottomColor: t.border }]}>
        {data.map((d, i) => {
          const h = max > 0 ? Math.max(4, (d.average / max) * CHART_HEIGHT) : 4;
          const active = i === focus;
          return (
            <Pressable
              key={d.weekday}
              accessibilityRole="button"
              accessibilityLabel={`${WEEKDAY_SHORT[d.weekday]}, ${d.average.toFixed(1)} drinks on average`}
              onPress={() => setSelected(selected === i ? null : i)}
              style={styles.hit}>
              <Text style={[styles.value, { color: active ? t.text : 'transparent' }]}>
                {d.average.toFixed(1)}
              </Text>
              <View
                style={[
                  styles.bar,
                  {
                    height: h,
                    backgroundColor: d.loggedDays ? t.accent : t.bucket.unlogged,
                    opacity: focus === -1 || active ? 1 : 0.55,
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.axis}>
        {data.map((d, i) => (
          <Text
            key={d.weekday}
            style={[styles.tick, { color: i === focus ? t.text : t.textFaint }]}>
            {WEEKDAY_SHORT[d.weekday]}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { fontSize: 13, minHeight: 18 },
  plot: {
    height: CHART_HEIGHT + 22,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  hit: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  value: { fontSize: 12, fontWeight: '700', marginBottom: 4, fontVariant: ['tabular-nums'] },
  bar: { width: '62%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  axis: { flexDirection: 'row', gap: 2, marginTop: -space.xs },
  tick: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600' },
});
