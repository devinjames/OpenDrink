import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/index.ts';

export function bucketLabels(threshold: number) {
  return {
    sober: 'Sober',
    moderate: threshold === 2 ? '1 drink' : `1–${threshold - 1}`,
    heavy: `${threshold}+`,
  } as const;
}

export function Legend({ threshold }: { threshold: number }) {
  const t = useTheme();
  const labels = bucketLabels(threshold);
  const items = [
    { color: t.bucket.sober, label: labels.sober },
    { color: t.bucket.moderate, label: labels.moderate },
    { color: t.bucket.heavy, label: labels.heavy },
    { color: t.bucket.unlogged, label: 'Not logged' },
  ];
  return (
    <View style={styles.row}>
      {items.map((i) => (
        <View key={i.label} style={styles.item}>
          <View style={[styles.swatch, { backgroundColor: i.color }]} />
          <Text style={[styles.text, { color: t.textMuted }]}>{i.label}</Text>
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
});
