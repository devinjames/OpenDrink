import { StyleSheet, Text, View } from 'react-native';

import type { Bucket } from '@/lib/stats.ts';
import { useTheme } from '@/theme/index.ts';

const range = (from: number, to: number) => (from === to ? `${from}` : `${from}–${to}`);

export function bucketLabels(threshold: number, orangeFrom: number) {
  return {
    sober: 'Sober',
    low: range(1, orangeFrom - 1),
    moderate: range(orangeFrom, threshold - 1),
    heavy: `${threshold}+`,
  } as const;
}

interface Props {
  threshold: number;
  orangeFrom: number;
  /** Optional per-bucket tallies shown next to each label. */
  counts?: Partial<Record<Bucket, number>>;
}

export function Legend({ threshold, orangeFrom, counts }: Props) {
  const t = useTheme();
  const labels = bucketLabels(threshold, orangeFrom);
  const items = [
    { bucket: 'sober' as const, label: labels.sober },
    { bucket: 'low' as const, label: labels.low },
    { bucket: 'moderate' as const, label: labels.moderate },
    { bucket: 'heavy' as const, label: labels.heavy },
    { bucket: 'unlogged' as const, label: 'Not logged' },
  ];
  return (
    <View style={styles.row}>
      {items.map((i) => (
        <View key={i.label} style={styles.item}>
          <View style={[styles.swatch, { backgroundColor: t.bucket[i.bucket] }]} />
          <Text style={[styles.text, { color: t.textMuted }]}>
            {i.label}
            {counts?.[i.bucket] !== undefined ? (
              <Text style={[styles.count, { color: t.text }]}> {counts[i.bucket]}</Text>
            ) : null}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  text: { fontSize: 12 },
  count: { fontWeight: '700', fontVariant: ['tabular-nums'] },
});
