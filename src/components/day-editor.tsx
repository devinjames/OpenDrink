import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Stepper } from '@/components/stepper.tsx';
import { formatLongDate, fromKey, type DateKey } from '@/lib/dates.ts';
import { bucketFor } from '@/lib/stats.ts';
import { radius, space, useTheme } from '@/theme/index.ts';

interface Props {
  day: DateKey | null;
  count: number | undefined;
  threshold: number;
  onSave: (count: number | null) => void;
  onClose: () => void;
}

export function DayEditor(props: Props) {
  return (
    <Modal
      visible={props.day !== null}
      transparent
      animationType="slide"
      onRequestClose={props.onClose}>
      <Pressable style={styles.backdrop} onPress={props.onClose} accessibilityLabel="Close" />
      {/* Keyed so the draft resets when a different day opens or its saved count changes. */}
      <Sheet key={`${props.day}:${props.count}`} {...props} />
    </Modal>
  );
}

function Sheet({ day, count, threshold, onSave }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(count ?? 0);
  const color = t.bucket[bucketFor(draft, threshold)];

  return (
    <View
      style={[
        styles.sheet,
        { backgroundColor: t.card, borderColor: t.border, paddingBottom: insets.bottom + space.lg },
      ]}>
      <View style={[styles.grabber, { backgroundColor: t.border }]} />
      <Text style={[styles.title, { color: t.text }]}>
        {day ? formatLongDate(fromKey(day)) : ''}
      </Text>
      <Text style={[styles.subtitle, { color: t.textMuted }]}>
        {count === undefined ? 'Not logged' : 'Edit this day'}
      </Text>

      <View style={[styles.stepper, { backgroundColor: t.cardRaised }]}>
        <Stepper
          size="lg"
          value={draft}
          onChange={setDraft}
          color={color}
          label={draft === 0 ? 'sober' : draft === 1 ? 'drink' : 'drinks'}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => onSave(draft)}
        style={({ pressed }) => [
          styles.save,
          { backgroundColor: t.accent, opacity: pressed ? 0.85 : 1 },
        ]}>
        <Text style={[styles.saveText, { color: t.onAccent }]}>
          {draft === 0 ? 'Save as sober day' : 'Save'}
        </Text>
      </Pressable>
      {count !== undefined ? (
        <Pressable onPress={() => onSave(null)} style={styles.clear} hitSlop={8}>
          <Text style={[styles.clearText, { color: t.danger }]}>Clear entry</Text>
        </Pressable>
      ) : null}
    </View>
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
    gap: space.md,
  },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginBottom: space.sm },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: -8 },
  stepper: { borderRadius: radius.md, paddingVertical: space.xl },
  save: { borderRadius: radius.md, paddingVertical: 16, alignItems: 'center' },
  saveText: { fontSize: 16, fontWeight: '700' },
  clear: { alignSelf: 'center', paddingVertical: space.xs },
  clearText: { fontSize: 14, fontWeight: '600' },
});
