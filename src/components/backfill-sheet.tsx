import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatLongDate, fromKey, type DateKey } from '@/lib/dates.ts';
import { bucketFor, type Entries } from '@/lib/stats.ts';
import { radius, space, useTheme } from '@/theme/index.ts';

interface Props {
  visible: boolean;
  days: DateKey[];
  threshold: number;
  orangeFrom: number;
  onSave: (values: Entries) => void;
  onDismiss: () => void;
}

export function BackfillSheet(props: Props) {
  return (
    <Modal
      visible={props.visible}
      transparent
      animationType="slide"
      onRequestClose={props.onDismiss}>
      <Pressable style={styles.backdrop} onPress={props.onDismiss} accessibilityLabel="Later" />
      {/* Keyed so drafts reset if the set of missing days changes. */}
      <Sheet key={props.days.join()} {...props} />
    </Modal>
  );
}

function Sheet({ days, threshold, orangeFrom, onSave, onDismiss }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<Entries>({});

  const set = (day: DateKey, value: number | undefined) =>
    setDraft((prev) => {
      const next = { ...prev };
      if (value === undefined) delete next[day];
      else next[day] = value;
      return next;
    });

  const filled = Object.keys(draft).length;
  const remaining = days.filter((d) => draft[d] === undefined);

  return (
    <View
      style={[
        styles.sheet,
        { backgroundColor: t.card, borderColor: t.border, paddingBottom: insets.bottom + space.lg },
      ]}>
      <View style={[styles.grabber, { backgroundColor: t.border }]} />
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: t.text }]}>Fill in the gaps</Text>
          <Text style={[styles.subtitle, { color: t.textMuted }]}>
            {days.length} day{days.length === 1 ? '' : 's'} this past week{' '}
            {days.length === 1 ? "isn't" : "aren't"} logged yet.
          </Text>
        </View>
        <Pressable onPress={onDismiss} hitSlop={10}>
          <Text style={[styles.later, { color: t.textMuted }]}>Later</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={{ gap: space.sm }}>
        {days.map((day) => (
          <DayRow
            key={day}
            day={day}
            value={draft[day]}
            threshold={threshold}
            orangeFrom={orangeFrom}
            onChange={(v) => set(day, v)}
          />
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          disabled={!remaining.length}
          onPress={() =>
            setDraft((prev) => ({
              ...prev,
              ...Object.fromEntries(remaining.map((d) => [d, 0])),
            }))
          }
          style={({ pressed }) => [
            styles.secondary,
            {
              borderColor: t.border,
              backgroundColor: t.cardRaised,
              opacity: !remaining.length ? 0.4 : pressed ? 0.8 : 1,
            },
          ]}>
          <Ionicons name="leaf" size={16} color={t.bucket.sober} />
          <Text style={[styles.buttonText, { color: t.text }]}>Rest sober</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={!filled}
          onPress={() => onSave(draft)}
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: t.accent, opacity: !filled ? 0.4 : pressed ? 0.85 : 1 },
          ]}>
          <Text style={[styles.buttonText, { color: t.onAccent }]}>
            {filled ? `Save ${filled} day${filled === 1 ? '' : 's'}` : 'Save'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function DayRow({
  day,
  value,
  threshold,
  orangeFrom,
  onChange,
}: {
  day: DateKey;
  value: number | undefined;
  threshold: number;
  orangeFrom: number;
  onChange: (v: number | undefined) => void;
}) {
  const t = useTheme();
  const sober = value === 0;
  const color = t.bucket[bucketFor(value, threshold, orangeFrom)];

  return (
    <View style={[styles.row, { backgroundColor: t.cardRaised }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.rowLabel, { color: t.text }]}>{formatLongDate(fromKey(day))}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: sober }}
        onPress={() => onChange(sober ? undefined : 0)}
        style={[
          styles.chip,
          {
            borderColor: sober ? t.bucket.sober : t.border,
            backgroundColor: sober ? t.bucket.sober : 'transparent',
          },
        ]}>
        <Text style={[styles.chipText, { color: sober ? '#FFFFFF' : t.textMuted }]}>Sober</Text>
      </Pressable>
      <View style={styles.mini}>
        <MiniButton
          icon="remove"
          disabled={!value}
          onPress={() => onChange((value ?? 0) - 1)}
          label="Fewer drinks"
        />
        <Text style={[styles.miniValue, { color: value ? color : t.textFaint }]}>
          {value ? value : '–'}
        </Text>
        <MiniButton icon="add" onPress={() => onChange((value ?? 0) + 1)} label="More drinks" />
      </View>
    </View>
  );
}

function MiniButton({
  icon,
  onPress,
  disabled,
  label,
}: {
  icon: 'add' | 'remove';
  onPress: () => void;
  disabled?: boolean;
  label: string;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={[styles.miniBtn, { backgroundColor: t.card, opacity: disabled ? 0.35 : 1 }]}>
      <Ionicons name={icon} size={16} color={t.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    gap: space.lg,
    maxHeight: '85%',
  },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 2 },
  later: { fontSize: 15, fontWeight: '600', paddingTop: 4 },
  list: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  chip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { fontSize: 13, fontWeight: '700' },
  mini: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniValue: {
    minWidth: 18,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  footer: { flexDirection: 'row', gap: space.md },
  secondary: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  primary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
});
