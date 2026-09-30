import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Alert, Linking, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Card } from '@/components/card.tsx';
import { Legend } from '@/components/legend.tsx';
import { Screen, SectionLabel } from '@/components/screen.tsx';
import { Stepper } from '@/components/stepper.tsx';
import { useToday } from '@/hooks/use-today.ts';
import { backupFileName, BackupError, createBackup, parseBackup } from '@/lib/backup.ts';
import { formatTime } from '@/lib/dates.ts';
import { entriesToCsv, exportFileName } from '@/lib/export.ts';
import { pickTextFile, shareFile } from '@/lib/files.ts';
import { ensurePermission, remindersSupported } from '@/lib/reminders.ts';
import { sampleEntries } from '@/lib/sample-data.ts';
import { MAX_THRESHOLD, MIN_THRESHOLD } from '@/lib/stats.ts';
import { useStore } from '@/store/index.tsx';
import { radius, space, useTheme } from '@/theme/index.ts';

function confirm(title: string, message: string, action: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ]);
}

function notify(title: string, message: string) {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;

export default function SettingsScreen() {
  const t = useTheme();
  const today = useToday();
  const { entries, settings, updateSettings, resetAll, importEntries, replaceEntries } = useStore();
  const { threshold, reminderEnabled, reminderHour, reminderMinute } = settings;

  const reminderDate = new Date();
  reminderDate.setHours(reminderHour, reminderMinute, 0, 0);

  const setTime = (d: Date | undefined) => {
    if (d) updateSettings({ reminderHour: d.getHours(), reminderMinute: d.getMinutes() });
  };

  const loggedCount = Object.keys(entries).length;

  const exportCsv = async () => {
    try {
      await shareFile({
        fileName: exportFileName(today),
        contents: entriesToCsv(entries, threshold),
        mimeType: 'text/csv',
        uti: 'public.comma-separated-values-text',
        dialogTitle: 'Export OpenDrink data',
      });
    } catch (e) {
      console.warn('Export failed', e);
      notify('Export failed', 'Your data could not be exported. Please try again.');
    }
  };

  const backUp = async () => {
    try {
      await shareFile({
        fileName: backupFileName(today),
        contents: createBackup(entries, settings, new Date()),
        mimeType: 'application/json',
        uti: 'public.json',
        dialogTitle: 'Save OpenDrink backup',
      });
    } catch (e) {
      console.warn('Backup failed', e);
      notify('Backup failed', 'Your backup could not be created. Please try again.');
    }
  };

  const restore = async () => {
    let backup: ReturnType<typeof parseBackup>;
    try {
      const text = await pickTextFile(['application/json']);
      if (text === null) return;
      backup = parseBackup(text);
    } catch (e) {
      if (!(e instanceof BackupError)) console.warn('Restore failed', e);
      const message = e instanceof BackupError ? e.message : 'The file could not be read.';
      return notify("Couldn't restore backup", message);
    }

    const incoming = Object.keys(backup.entries).length;
    const apply = () => {
      replaceEntries(backup.entries, backup.settings);
      notify('Backup restored', `Restored ${days(incoming)}.`);
    };
    if (loggedCount === 0) return apply();
    confirm(
      'Replace your data?',
      `Your ${days(loggedCount)} on this device will be replaced by the ${days(incoming)} ` +
        'in this backup. Back up first if you want to keep them.',
      'Replace',
      apply
    );
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
        <Pressable
          onPress={backUp}
          disabled={loggedCount === 0}
          style={[styles.link, loggedCount === 0 && { opacity: 0.4 }]}>
          <Text style={[styles.linkText, { color: t.accent }]}>Back up data</Text>
          <Text style={[styles.rowSub, { color: t.textMuted }]}>
            {loggedCount === 0
              ? 'Nothing logged yet'
              : `JSON file with ${days(loggedCount)} and your settings`}
          </Text>
        </Pressable>
        <Pressable onPress={restore} style={styles.link}>
          <Text style={[styles.linkText, { color: t.accent }]}>Restore from backup</Text>
          <Text style={[styles.rowSub, { color: t.textMuted }]}>
            Replaces the data on this device
          </Text>
        </Pressable>
        <Pressable
          onPress={exportCsv}
          disabled={loggedCount === 0}
          style={[styles.link, loggedCount === 0 && { opacity: 0.4 }]}>
          <Text style={[styles.linkText, { color: t.accent }]}>Export as CSV</Text>
          <Text style={[styles.rowSub, { color: t.textMuted }]}>
            For spreadsheets only, not for restoring
          </Text>
        </Pressable>
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
              'Delete',
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
