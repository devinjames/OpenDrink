import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Alert, Linking, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Card } from '@/components/card.tsx';
import { Legend } from '@/components/legend.tsx';
import { Screen, SectionLabel } from '@/components/screen.tsx';
import { Stepper } from '@/components/stepper.tsx';
import { useToday } from '@/hooks/use-today.ts';
import { formatTime } from '@/lib/dates.ts';
import { ensurePermission, remindersSupported } from '@/lib/reminders.ts';
import { sampleEntries } from '@/lib/sample-data.ts';
import { MAX_THRESHOLD, MIN_THRESHOLD } from '@/lib/stats.ts';
import { useStore } from '@/store/index.tsx';
import { radius, space, useTheme } from '@/theme/index.ts';

function confirm(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

export default function SettingsScreen() {
  const t = useTheme();
  const today = useToday();
  const { settings, updateSettings, resetAll, importEntries } = useStore();
  const { threshold, reminderEnabled, reminderHour, reminderMinute } = settings;

  const reminderDate = new Date();
  reminderDate.setHours(reminderHour, reminderMinute, 0, 0);

  const setTime = (d: Date | undefined) => {
    if (d) updateSettings({ reminderHour: d.getHours(), reminderMinute: d.getMinutes() });
  };

  const toggleReminder = async (on: boolean) => {
    if (!on) return updateSettings({ reminderEnabled: false });
    if (await ensurePermission()) return updateSettings({ reminderEnabled: true });
    Alert.alert(
      'Notifications are off',
      'Allow notifications for OpenDrink in system settings to get your daily reminder.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open settings', onPress: () => Linking.openSettings() },
      ]
    );
  };

  return (
    <Screen title="Settings">
      <SectionLabel>Heavy-day threshold</SectionLabel>
      <Card style={{ gap: space.lg }}>
        <Text style={[styles.body, { color: t.textMuted }]}>
          Days with this many drinks or more are highlighted as heavy days on your calendar.
        </Text>
        <Stepper
          value={threshold}
          onChange={(v) => updateSettings({ threshold: v })}
          min={MIN_THRESHOLD}
          max={MAX_THRESHOLD}
          label="drinks"
          color={t.bucket.heavy}
        />
        <Legend threshold={threshold} />
      </Card>

      <SectionLabel>Daily reminder</SectionLabel>
      <Card style={{ gap: space.md }}>
        <View style={styles.row}>
          <View style={[styles.icon, { backgroundColor: t.accentSoft }]}>
            <Ionicons name="notifications" size={18} color={t.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: t.text }]}>Remind me to log</Text>
            <Text style={[styles.rowSub, { color: t.textMuted }]}>
              {remindersSupported
                ? 'A gentle nudge once a day'
                : 'Available in the iOS and Android apps'}
            </Text>
          </View>
          <Switch
            value={reminderEnabled}
            onValueChange={toggleReminder}
            disabled={!remindersSupported}
            trackColor={{ true: t.accent, false: t.border }}
            thumbColor={Platform.OS === 'android' ? t.card : undefined}
          />
        </View>

        {reminderEnabled ? (
          <View style={[styles.row, styles.timeRow, { borderTopColor: t.border }]}>
            <Text style={[styles.rowTitle, { color: t.text, flex: 1 }]}>Time</Text>
            {Platform.OS === 'ios' ? (
              <DateTimePicker
                mode="time"
                display="compact"
                value={reminderDate}
                onValueChange={(_, d) => setTime(d)}
                accentColor={t.accent}
                themeVariant={t.scheme}
              />
            ) : (
              <Pressable
                onPress={() =>
                  DateTimePickerAndroid.open({
                    mode: 'time',
                    value: reminderDate,
                    onValueChange: (_, d) => setTime(d),
                  })
                }
                style={[styles.timePill, { backgroundColor: t.cardRaised }]}>
                <Text style={[styles.timeText, { color: t.text }]}>
                  {formatTime(reminderHour, reminderMinute)}
                </Text>
              </Pressable>
            )}
          </View>
        ) : null}
      </Card>

      <SectionLabel>Data</SectionLabel>
      <Card style={{ gap: space.md }}>
        <Text style={[styles.body, { color: t.textMuted }]}>
          Your data is stored only on this device. Nothing is uploaded.
        </Text>
        {__DEV__ ? (
          <Pressable onPress={() => importEntries(sampleEntries(today))} style={styles.link}>
            <Text style={[styles.linkText, { color: t.accent }]}>Load sample data (dev)</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() =>
            confirm(
              'Delete all data?',
              'This removes every logged day and resets settings.',
              resetAll
            )
          }
          style={styles.link}>
          <Text style={[styles.linkText, { color: t.danger }]}>Delete all data</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 14, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowSub: { fontSize: 13, marginTop: 1 },
  timeRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.md },
  timePill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.sm },
  timeText: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  link: { paddingVertical: space.xs },
  linkText: { fontSize: 15, fontWeight: '600' },
});
