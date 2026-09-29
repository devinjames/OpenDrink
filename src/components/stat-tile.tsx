import { StyleSheet, Text, View } from 'react-native';

import { radius, space, useTheme } from '@/theme/index.ts';

interface Props {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
}

export function StatTile({ label, value, unit, hint }: Props) {
  const t = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: t.card, borderColor: t.border }]}>
      <Text style={[styles.label, { color: t.textMuted }]}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: t.text }]}>{value}</Text>
        {unit ? <Text style={[styles.unit, { color: t.textMuted }]}>{unit}</Text> : null}
      </View>
      {hint ? <Text style={[styles.hint, { color: t.textFaint }]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.lg,
    gap: 4,
  },
  label: { fontSize: 13, fontWeight: '600' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  value: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 14, fontWeight: '600' },
  hint: { fontSize: 12 },
});
