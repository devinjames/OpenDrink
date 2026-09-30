import Ionicons from '@expo/vector-icons/Ionicons';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import Tabs from 'expo-router/tabs';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NotificationBridge } from '@/components/notification-bridge.tsx';
import { StoreProvider, useStore } from '@/store/index.tsx';
import { useTheme } from '@/theme/index.ts';

SplashScreen.preventAutoHideAsync();

function AppTabs() {
  const t = useTheme();
  const { ready } = useStore();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  const base = t.scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: t.background,
      card: t.card,
      border: t.border,
      primary: t.accent,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <NotificationBridge />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: t.accent,
          tabBarInactiveTintColor: t.textFaint,
          tabBarStyle: { backgroundColor: t.card, borderTopColor: t.border },
          tabBarLabelStyle: { fontWeight: '600' },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Today',
            tabBarIcon: ({ color, size }) => <Ionicons name="today" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: 'Stats',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="stats-chart" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="commitments"
          options={{
            title: 'Commit',
            tabBarIcon: ({ color, size }) => <Ionicons name="flag" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-sharp" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
      {/* Opaque backdrop for the clock/battery so scrolled content doesn't show through it. */}
      <View
        pointerEvents="none"
        style={[
          styles.statusBackdrop,
          { height: insets.top, backgroundColor: t.card, borderBottomColor: t.border },
        ]}
      />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  statusBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

export default function RootLayout() {
  return (
    <StoreProvider>
      <AppTabs />
    </StoreProvider>
  );
}
