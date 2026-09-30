import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card.tsx';
import { commitmentProgress, formatDuration, type SoberCommitment } from '@/lib/commitments.ts';
import { addDays, fromKey, toKey } from '@/lib/dates.ts';
import { bucketFor, type Entries } from '@/lib/stats.ts';
import { space, useTheme } from '@/theme/index.ts';

interface Props {
  commitment: SoberCommitment;
  entries: Entries;
  today: Date;
  threshold: number;
  orangeFrom: number;
}

/** Shows the active sober commitment as one small box per day, coloured by what was logged. */
export function CommitmentPane({ commitment, entries, today, threshold, orangeFrom }: Props) {
  const t = useTheme();
  const progress = commitmentProgress(commitment, entries, today);
  if (progress.status !== 'active') return null;

  const start = fromKey(commitment.start);
  const days = Array.from({ length: commitment.days }, (_, i) => {
    const count = entries[toKey(addDays(start, i))];
    return { count, bucket: bucketFor(count, threshold, orangeFrom) };
  });

  return (
    <Pressable accessibilityRole="button" onPress={() => router.navigate('/commitments')}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: t.accent }]}>
            COMMITMENT{' '}
            <Text style={[styles.sub, { color: t.textMuted }]}>
              · {formatDuration(commitment.days)} · {progress.remaining} to go
            </Text>
          </Text>
          <Ionicons name="chevron-forward" size={16} color={t.textFaint} />
        </View>
        <View style={styles.grid}>
          {days.map((d, i) => (
            <View
              key={i}
              style={[
                styles.box,
                {
                  backgroundColor: t.bucket[d.bucket],
                  opacity: d.count === undefined ? 0.6 : 1,
                },
              ]}>
              {d.count !== undefined ? <Text style={styles.boxText}>{d.count}</Text> : null}
            </View>
          ))}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md, padding: space.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  sub: { fontSize: 13, fontWeight: '500', letterSpacing: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF', fontVariant: ['tabular-nums'] },
});
