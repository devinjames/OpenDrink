import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fromKey, isWeekend } from '@/lib/dates.ts';
import type { DailyPoint } from '@/lib/stats.ts';
import { space, useTheme } from '@/theme/index.ts';

const CHART_HEIGHT = 160;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const label = (key: string) => {
  const d = fromKey(key);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
};

/**
 * Drinks per day as bars with a cumulative line on top. Bars use the left scale
 * and the line its own right scale. Tap the plot to read a specific day.
 */
export function TrendChart({ data }: { data: DailyPoint[] }) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const maxDay = Math.max(...data.map((d) => d.count ?? 0), 1);
  const total = data.at(-1)?.cumulative ?? 0;
  const maxCum = Math.max(total, 1);
  const n = data.length;
  const slot = width / n;
  const focus = selected !== null && selected < n ? selected : n - 1;
  const p = data[focus];

  const xAt = (i: number) => (i + 0.5) * slot;
  const yAt = (v: number) => CHART_HEIGHT - (v / maxCum) * (CHART_HEIGHT - 8) - 2;

  const segments = [];
  if (width > 0) {
    for (let i = 1; i < n; i++) {
      const x1 = xAt(i - 1);
      const y1 = yAt(data[i - 1].cumulative);
      const x2 = xAt(i);
      const y2 = yAt(data[i].cumulative);
      const len = Math.hypot(x2 - x1, y2 - y1);
      segments.push(
        <View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: (x1 + x2) / 2 - len / 2,
            top: (y1 + y2) / 2 - 1,
            width: len,
            height: 2,
            backgroundColor: t.text,
            transform: [{ rotate: `${Math.atan2(y2 - y1, x2 - x1)}rad` }],
          }}
        />
      );
    }
  }

  const pick = (x: number) =>
    setSelected(Math.min(n - 1, Math.max(0, Math.floor(x / Math.max(slot, 1)))));

  return (
    <View style={{ gap: space.md }}>
      <Text style={[styles.readout, { color: t.textMuted }]}>
        {label(p.key)}:{' '}
        {p.count === null ? 'not logged' : `${p.count} drink${p.count === 1 ? '' : 's'}`} ·{' '}
        {p.cumulative} total so far
      </Text>
      <View
        style={[styles.plot, { borderBottomColor: t.border }]}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onResponderGrant={(e) => pick(e.nativeEvent.locationX)}
        onResponderMove={(e) => pick(e.nativeEvent.locationX)}
        accessibilityLabel={`Drinks per day with cumulative total of ${total}`}>
        {data.map((d, i) => {
          const h = d.count ? Math.max(2, (d.count / maxDay) * CHART_HEIGHT) : 0;
          return (
            <View key={d.key} pointerEvents="none" style={styles.slot}>
              <View
                style={{
                  height: h,
                  width: '70%',
                  backgroundColor: isWeekend(fromKey(d.key).getDay()) ? t.weekend : t.accent,
                  opacity: i === focus ? 1 : 0.6,
                  borderTopLeftRadius: 2,
                  borderTopRightRadius: 2,
                }}
              />
            </View>
          );
        })}
        {segments}
        {width > 0 && (
          <View
            pointerEvents="none"
            style={[
              styles.dot,
              { left: xAt(focus) - 4, top: yAt(p.cumulative) - 4, backgroundColor: t.text },
            ]}
          />
        )}
      </View>
      <View style={styles.axis}>
        <Text style={[styles.tick, { color: t.textFaint }]}>{label(data[0].key)}</Text>
        <Text style={[styles.tick, { color: t.textFaint }]}>{label(data[n - 1].key)}</Text>
      </View>
      <View style={styles.legend}>
        <LegendItem color={t.accent} text={`Per day (max ${maxDay})`} shape="bar" muted={t.textMuted} />
        <LegendItem color={t.weekend} text="Weekend" shape="bar" muted={t.textMuted} />
        <LegendItem color={t.text} text={`Cumulative (${total})`} shape="line" muted={t.textMuted} />
      </View>
    </View>
  );
}

function LegendItem({
  color,
  text,
  shape,
  muted,
}: {
  color: string;
  text: string;
  shape: 'bar' | 'line';
  muted: string;
}) {
  return (
    <View style={styles.legendItem}>
      <View
        style={{
          backgroundColor: color,
          width: shape === 'bar' ? 10 : 14,
          height: shape === 'bar' ? 10 : 2,
          borderRadius: 2,
        }}
      />
      <Text style={{ color: muted, fontSize: 12 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { fontSize: 13, minHeight: 18 },
  plot: {
    height: CHART_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  slot: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  dot: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -space.xs },
  tick: { fontSize: 12, fontWeight: '600' },
  legend: { flexDirection: 'row', gap: space.lg, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
