import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, useTheme } from '@/theme/index.ts';

interface Props {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  size?: 'md' | 'lg';
  color?: string;
  label?: string;
}

const tap = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
};

export function Stepper({ value, onChange, min = 0, max = 99, size = 'md', color, label }: Props) {
  const t = useTheme();
  const dim = size === 'lg' ? 56 : 40;
  const valueColor = color ?? t.text;

  const button = (icon: 'remove' | 'add', disabled: boolean, next: number) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={icon === 'add' ? 'Increase' : 'Decrease'}
      disabled={disabled}
      onPress={() => {
        tap();
        onChange(next);
      }}
      style={({ pressed }) => [
        styles.button,
        {
          width: dim,
          height: dim,
          backgroundColor: t.cardRaised,
          borderColor: t.border,
          opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
      ]}>
      <Ionicons name={icon} size={size === 'lg' ? 28 : 20} color={t.text} />
    </Pressable>
  );

  return (
    <View style={styles.row}>
      {button('remove', value <= min, value - 1)}
      <View style={styles.valueWrap}>
        <Text
          style={[styles.value, { color: valueColor, fontSize: size === 'lg' ? 44 : 28 }]}
          accessibilityLabel={`${value}${label ? ` ${label}` : ''}`}>
          {value}
        </Text>
        {label ? <Text style={[styles.label, { color: t.textMuted }]}>{label}</Text> : null}
      </View>
      {button('add', value >= max, value + 1)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  button: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueWrap: { minWidth: 72, alignItems: 'center' },
  value: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  label: { fontSize: 13, marginTop: -2 },
});
