import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, useTheme } from '@/theme/index.ts';

interface Props<T extends string> {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}

export function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  const t = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: t.cardRaised, borderColor: t.border }]}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.id)}
            style={[styles.seg, active && { backgroundColor: t.accent }]}>
            <Text style={[styles.label, { color: active ? t.onAccent : t.textMuted }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  seg: { flex: 1, paddingVertical: 8, borderRadius: radius.pill, alignItems: 'center' },
  label: { fontSize: 14, fontWeight: '600' },
});
