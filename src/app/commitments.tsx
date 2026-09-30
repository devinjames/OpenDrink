import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card.tsx';
import { Screen, SectionLabel } from '@/components/screen.tsx';
import { Stepper } from '@/components/stepper.tsx';
import { useToday } from '@/hooks/use-today.ts';
import {
  commitmentEnd,
  commitmentProgress,
  commitmentStartFor,
  COMMITMENT_WEEK_PRESETS,
  DEFAULT_WEEKLY_TARGET,
  formatDuration,
  MAX_COMMITMENT_DAYS,
  MAX_START_OFFSET_DAYS,
  MAX_WEEKLY_TARGET,
  MIN_COMMITMENT_DAYS,
  weekProgress,
  type SoberCommitment,
} from '@/lib/commitments.ts';
import { confirm } from '@/lib/confirm.ts';
import {
  addDays,
  daysBetween,
  formatLongDate,
  formatShortDate,
  fromKey,
  startOfDay,
  toKey,
} from '@/lib/dates.ts';
import { useStore } from '@/store/index.tsx';
import { radius, space, useTheme, type Theme } from '@/theme/index.ts';

export default function CommitmentsScreen() {
  const { settings } = useStore();
  return (
    <Screen title="Commitments">
      <SectionLabel>Sober days</SectionLabel>
      {settings.commitment ? (
        <CommitmentCard commitment={settings.commitment} />
      ) : (
        <NewCommitmentCard />
      )}

      <SectionLabel>Weekly drink target</SectionLabel>
      <WeeklyTargetCard />
    </Screen>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  const t = useTheme();
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={[styles.track, { backgroundColor: t.bucket.unlogged }]}>
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: active ? t.accent : t.border },
        { backgroundColor: active ? t.accent : t.cardRaised },
      ]}>
      <Text style={[styles.chipText, { color: active ? t.onAccent : t.text }]}>{label}</Text>
    </Pressable>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.primary,
        { backgroundColor: t.accent, opacity: pressed ? 0.8 : 1 },
      ]}>
      <Text style={[styles.primaryText, { color: t.onAccent }]}>{label}</Text>
    </Pressable>
  );
}

function LinkButton({
  label,
  color,
  onPress,
}: {
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.link}>
      <Text style={[styles.linkText, { color }]}>{label}</Text>
    </Pressable>
  );
}

function StartDateRow({
  value,
  today,
  onChange,
}: {
  value: Date;
  today: Date;
  onChange: (d: Date) => void;
}) {
  const t = useTheme();
  const minimumDate = addDays(today, -MAX_START_OFFSET_DAYS);
  const maximumDate = addDays(today, MAX_START_OFFSET_DAYS);
  const pick = (d: Date) => onChange(startOfDay(d));

  let control;
  if (Platform.OS === 'ios') {
    control = (
      <DateTimePicker
        mode="date"
        display="compact"
        value={value}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onValueChange={(_, d) => pick(d)}
        accentColor={t.accent}
        themeVariant={t.scheme}
      />
    );
  } else if (Platform.OS === 'android') {
    control = (
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          DateTimePickerAndroid.open({
            mode: 'date',
            value,
            minimumDate,
            maximumDate,
            onValueChange: (_, d) => pick(d),
          })
        }
        style={[styles.datePill, { backgroundColor: t.cardRaised }]}>
        <Text style={[styles.dateText, { color: t.text }]}>{formatLongDate(value)}</Text>
      </Pressable>
    );
  } else {
    // The native picker isn't available on web: step a day at a time instead.
    const offset = daysBetween(today, value);
    control = (
      <Stepper
        value={offset}
        onChange={(n) => pick(addDays(today, n))}
        min={-MAX_START_OFFSET_DAYS}
        max={MAX_START_OFFSET_DAYS}
        label="days from today"
      />
    );
  }

  return (
    <View style={styles.startRow}>
      <Text style={[styles.rowTitle, { color: t.text, flex: 1 }]}>Start date</Text>
      {control}
    </View>
  );
}

function startPhrase(start: Date, today: Date): string {
  const diff = daysBetween(today, start);
  if (diff === 0) return 'Starts today';
  if (diff === 1) return 'Starts tomorrow';
  if (diff === -1) return 'Started yesterday';
  return diff > 0 ? `Starts ${formatLongDate(start)}` : `Started ${formatLongDate(start)}`;
}

function NewCommitmentCard() {
  const t = useTheme();
  const today = useToday();
  const { entries, updateSettings } = useStore();
  const [weeks, setWeeks] = useState<number | 'custom'>(4);
  const [customDays, setCustomDays] = useState(10);
  // null = follow the suggested default (today, or tomorrow if today has drinks).
  const [chosenStart, setChosenStart] = useState<Date | null>(null);

  const days = weeks === 'custom' ? customDays : weeks * 7;
  const suggested = commitmentStartFor(entries, today);
  const start = chosenStart ? toKey(chosenStart) : suggested;
  const startDate = fromKey(start);
  const end = commitmentEnd({ start, days });
  const suggestedNote =
    !chosenStart && suggested !== toKey(today) ? '\nToday already has drinks logged.' : '';

  return (
    <Card style={{ gap: space.lg }}>
      <Text style={[styles.body, { color: t.textMuted }]}>
        Commit to a run of sober days. Only days you log as sober count toward it.
      </Text>

      <View style={styles.chips} accessibilityRole="radiogroup">
        {COMMITMENT_WEEK_PRESETS.map((w) => (
          <Chip
            key={w}
            label={`${w} ${w === 1 ? 'week' : 'weeks'}`}
            active={weeks === w}
            onPress={() => setWeeks(w)}
          />
        ))}
        <Chip label="Custom" active={weeks === 'custom'} onPress={() => setWeeks('custom')} />
      </View>

      {weeks === 'custom' ? (
        <Stepper
          value={customDays}
          onChange={setCustomDays}
          min={MIN_COMMITMENT_DAYS}
          max={MAX_COMMITMENT_DAYS}
          label={customDays === 1 ? 'day' : 'days'}
          color={t.bucket.sober}
        />
      ) : null}

      <StartDateRow value={startDate} today={today} onChange={setChosenStart} />

      <Text style={[styles.meta, { color: t.textMuted }]}>
        {startPhrase(startDate, today)} · ends {formatLongDate(end)}
        {suggestedNote}
      </Text>

      <PrimaryButton
        label={`Commit to ${formatDuration(days)}`}
        onPress={() => updateSettings({ commitment: { start, days } })}
      />
    </Card>
  );
}

function statusStyle(t: Theme, status: ReturnType<typeof commitmentProgress>['status']) {
  switch (status) {
    case 'complete':
      return { icon: 'trophy' as const, color: t.bucket.sober, text: 'Commitment complete' };
    case 'broken':
      return { icon: 'alert-circle' as const, color: t.bucket.heavy, text: 'Commitment broken' };
    case 'upcoming':
      return { icon: 'time' as const, color: t.accent, text: 'Not started yet' };
    default:
      return { icon: 'flag' as const, color: t.accent, text: 'In progress' };
  }
}

function CommitmentCard({ commitment }: { commitment: SoberCommitment }) {
  const t = useTheme();
  const today = useToday();
  const { entries, updateSettings } = useStore();
  const p = useMemo(
    () => commitmentProgress(commitment, entries, today),
    [commitment, entries, today]
  );
  const s = statusStyle(t, p.status);
  const end = commitmentEnd(commitment);
  const clear = () => updateSettings({ commitment: null });
  const restart = () =>
    updateSettings({
      commitment: { start: commitmentStartFor(entries, today), days: commitment.days },
    });

  return (
    <Card style={{ gap: space.md }}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: t.accentSoft }]}>
          <Ionicons name={s.icon} size={18} color={s.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, { color: t.text }]}>{s.text}</Text>
          <Text style={[styles.rowSub, { color: t.textMuted }]}>
            {formatDuration(commitment.days)} · {formatLongDate(fromKey(commitment.start))} –{' '}
            {formatLongDate(end)}
          </Text>
        </View>
      </View>

      <View style={styles.bigRow}>
        <Text style={[styles.big, { color: t.text }]}>{p.soberDays}</Text>
        <Text style={[styles.bigUnit, { color: t.textMuted }]}>
          of {commitment.days} sober {commitment.days === 1 ? 'day' : 'days'}
        </Text>
      </View>
      <ProgressBar
        value={p.soberDays / commitment.days}
        color={p.status === 'broken' ? t.bucket.heavy : t.bucket.sober}
      />

      {p.status === 'active' ? (
        <Text style={[styles.meta, { color: t.textMuted }]}>
          {p.remaining > 0
            ? `Day ${p.elapsed} of ${commitment.days} · ${p.remaining} to go`
            : 'The last day has passed — log the missing days to finish.'}
        </Text>
      ) : null}
      {p.status === 'broken' && p.brokenOn ? (
        <Text style={[styles.meta, { color: t.textMuted }]}>
          Drinks logged on {formatLongDate(fromKey(p.brokenOn))}. Starting again is part of it.
        </Text>
      ) : null}

      {p.unloggedDays > 0 && p.status !== 'broken' ? (
        <Pressable
          onPress={() => router.navigate('/')}
          style={[styles.banner, { backgroundColor: t.accentSoft }]}>
          <Ionicons name="calendar-outline" size={16} color={t.accent} />
          <Text style={[styles.bannerText, { color: t.text }]}>
            {p.unloggedDays} {p.unloggedDays === 1 ? 'day' : 'days'} not logged yet
          </Text>
          <Ionicons name="chevron-forward" size={16} color={t.accent} />
        </Pressable>
      ) : null}

      {p.status === 'broken' ? (
        <PrimaryButton label={`Start ${formatDuration(commitment.days)} again`} onPress={restart} />
      ) : null}
      {p.status === 'complete' ? (
        <PrimaryButton label="Make a new commitment" onPress={clear} />
      ) : (
        <LinkButton
          label="End commitment"
          color={t.danger}
          onPress={() => confirm('End commitment?', 'Your logged days are kept.', 'End', clear)}
        />
      )}
    </Card>
  );
}

function WeeklyTargetCard() {
  const t = useTheme();
  const today = useToday();
  const { entries, settings, updateSettings } = useStore();
  const target = settings.weeklyTarget;
  const w = useMemo(() => weekProgress(entries, today), [entries, today]);

  if (target === null) {
    return (
      <Card style={{ gap: space.lg }}>
        <Text style={[styles.body, { color: t.textMuted }]}>
          Set a maximum number of drinks for each week (Sunday to Saturday) and track how
          you&apos;re doing against it.
        </Text>
        <PrimaryButton
          label="Set a weekly target"
          onPress={() => updateSettings({ weeklyTarget: DEFAULT_WEEKLY_TARGET })}
        />
      </Card>
    );
  }

  const left = target - w.drinks;
  const color =
    left < 0 ? t.bucket.heavy : left === 0 && target > 0 ? t.bucket.moderate : t.bucket.sober;
  const weekEnd = addDays(w.weekStart, 6);

  return (
    <Card style={{ gap: space.md }}>
      <Stepper
        value={target}
        onChange={(v) => updateSettings({ weeklyTarget: v })}
        min={0}
        max={MAX_WEEKLY_TARGET}
        label="drinks / week"
      />

      <View style={[styles.divider, { borderTopColor: t.border }]} />

      <Text style={[styles.rowTitle, { color: t.text }]}>
        This week{' '}
        <Text style={[styles.rowSub, { color: t.textMuted }]}>
          {formatShortDate(w.weekStart)} – {formatShortDate(weekEnd)}
        </Text>
      </Text>
      <View style={styles.bigRow}>
        <Text style={[styles.big, { color: t.text }]}>{w.drinks}</Text>
        <Text style={[styles.bigUnit, { color: t.textMuted }]}>of {target} drinks</Text>
      </View>
      <ProgressBar value={target > 0 ? w.drinks / target : w.drinks > 0 ? 1 : 0} color={color} />
      <Text style={[styles.meta, { color: t.textMuted }]}>
        {left > 0
          ? `${left} left this week`
          : left === 0
            ? 'At your target for this week'
            : `${-left} over your target`}
        {` · ${w.loggedDays} of ${w.daysSoFar} days logged`}
      </Text>

      <LinkButton
        label="Remove target"
        color={t.danger}
        onPress={() => updateSettings({ weeklyTarget: null })}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 14, lineHeight: 20 },
  meta: { fontSize: 13, lineHeight: 18 },
  startRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  datePill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.md },
  dateText: { fontSize: 16, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { fontSize: 14, fontWeight: '600' },
  primary: { paddingVertical: 14, borderRadius: radius.md, alignItems: 'center' },
  primaryText: { fontSize: 16, fontWeight: '700' },
  link: { paddingVertical: space.xs },
  linkText: { fontSize: 15, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowSub: { fontSize: 13, fontWeight: '400' },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  big: { fontSize: 36, fontWeight: '800', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  bigUnit: { fontSize: 15, fontWeight: '600' },
  track: { height: 10, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
  },
  bannerText: { flex: 1, fontSize: 14, fontWeight: '500' },
});
