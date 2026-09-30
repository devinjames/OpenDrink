import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space, useTheme } from '@/theme/index.ts';

export function Screen({ title, children }: { title?: string; children: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: t.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space.lg }]}>
      <View style={styles.inner}>
        {title ? <Text style={[styles.title, { color: t.text }]}>{title}</Text> : null}
        {children}
      </View>
    </ScrollView>
  );
}

export function SectionLabel({ children }: { children: string }) {
  const t = useTheme();
  return <Text style={[styles.section, { color: t.textMuted }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  inner: { gap: space.lg, width: '100%', maxWidth: 560, alignSelf: 'center' },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -0.8 },
  section: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: -space.sm,
    marginLeft: space.xs,
  },
});
