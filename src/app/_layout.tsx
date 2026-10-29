import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useLoadResult } from '@/data/hooks';
import { loadSettings } from '@/db/repo';
import { configureNotifications } from '@/services/notifications';
import { ErrorState } from '@/ui/components';
import { useTheme } from '@/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { colors, dark } = useTheme();
  const { value: settings, error, reload } = useLoadResult(loadSettings);

  useEffect(() => {
    configureNotifications().catch((e) => console.warn(e));
  }, []);
  // The splash stays up until settings load; if they can't, it must still go, or the app looks frozen.
  useEffect(() => {
    if (settings || error) SplashScreen.hideAsync().catch(() => {});
  }, [settings, error]);

  if (!settings) {
    if (!error) return null;
    return (
      <SafeAreaProvider>
        <ErrorState error={error} onRetry={reload} />
      </SafeAreaProvider>
    );
  }
  return (
    <SafeAreaProvider>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Protected guard={settings.onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="apps" />
          <Stack.Screen name="pause-apps" />
          <Stack.Screen name="review" />
          <Stack.Screen name="challenges" />
          <Stack.Screen name="detection" />
          <Stack.Screen name="goal/[id]" options={{ presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Protected guard={!settings.onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
      </Stack>
    </SafeAreaProvider>
  );
}
