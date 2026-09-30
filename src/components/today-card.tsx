import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card.tsx';
import { Stepper } from '@/components/stepper.tsx';
import { formatLongDate } from '@/lib/dates.ts';
import { bucketFor } from '@/lib/stats.ts';
import { radius, space, useTheme } from '@/theme/index.ts';

interface Props {
  today: Date;
  count: number | undefined;
  threshold: number;
  orangeFrom: number;
  streak: number;
  onChange: (count: number | null) => void;
}

export function TodayCard({ today, count, threshold, orangeFrom, streak, onChange }: Props) {
  const t = useTheme();
  const bucket = bucketFor(count, threshold, orangeFrom);
  const color = t.bucket[bucket];

  const headline =
    count === undefined
      ? 'Not logged yet'
      : count === 0
        ? 'Sober day'
        : `${count} drink${count === 1 ? '' : 's'}`;

  const sub =
    count === undefined
      ? 'How is today going?'
      : bucket === 'sober'
        ? 'Nice work. Every sober day counts.'
        : bucket === 'heavy'
          ? `At or above your limit of ${threshold}.`
          : `Under your limit of ${threshold}.`;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: t.accent }]}>
          TODAY <Text style={[styles.date, { color: t.textMuted }]}>· {formatLongDate(today)}</Text>
        </Text>
        {streak > 0 ? (
          <View style={[styles.streak, { backgroundColor: t.accentSoft }]}>
            <Ionicons name="leaf" size={12} color={t.accent} />
            <Text style={[styles.streakText, { color: t.accent }]}>
              {streak} day{streak === 1 ? '' : 's'} sober
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.statusRow}>
        <View
          style={[
            styles.orb,
            {
              borderColor: count === undefined ? t.border : color,
              backgroundColor: count === undefined ? t.cardRaised : color + '22',
            },
          ]}>
          <Ionicons
            name={count === undefined ? 'help' : bucket === 'sober' ? 'checkmark' : 'wine'}
            size={22}
            color={count === undefined ? t.textFaint : color}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headline, { color: t.text }]}>{headline}</Text>
          <Text style={[styles.sub, { color: t.textMuted }]}>{sub}</Text>
        </View>
      </View>

      {count === undefined ? (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => onChange(0)}
            style={({ pressed }) => [
              styles.primary,
              { backgroundColor: t.bucket.sober, opacity: pressed ? 0.8 : 1 },
            ]}>
            <Ionicons name="checkmark-circle" size={18} color="#04201C" />
            <Text style={[styles.primaryText, { color: '#04201C' }]}>Sober today</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => onChange(1)}
            style={({ pressed }) => [
              styles.secondary,
              { borderColor: t.border, backgroundColor: t.cardRaised, opacity: pressed ? 0.8 : 1 },
            ]}>
            <Ionicons name="add" size={18} color={t.text} />
            <Text style={[styles.primaryText, { color: t.text }]}>Log a drink</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.stepperWrap, { backgroundColor: t.cardRaised }]}>
          <Stepper
            value={count}
            onChange={onChange}
            color={color}
            label={count === 1 ? 'drink' : 'drinks'}
          />
          <Pressable onPress={() => onChange(null)} hitSlop={8} style={styles.clear}>
            <Text style={[styles.clearText, { color: t.textFaint }]}>Clear today</Text>
          </Pressable>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md, padding: space.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  date: { fontSize: 13, fontWeight: '500', letterSpacing: 0 },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  streakText: { fontSize: 12, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  orb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  sub: { fontSize: 13, marginTop: 1 },
  actions: { flexDirection: 'row', gap: space.md },
  primary: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  secondary: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  primaryText: { fontSize: 15, fontWeight: '700' },
  stepperWrap: { borderRadius: radius.md, paddingVertical: space.sm, gap: space.xs },
  clear: { alignSelf: 'center' },
  clearText: { fontSize: 13, fontWeight: '600' },
});
