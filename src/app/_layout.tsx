import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useLoad } from '@/data/hooks';
import { loadSettings } from '@/db/repo';
import { configureNotifications } from '@/services/notifications';
import { useTheme } from '@/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { colors, dark } = useTheme();
  const settings = useLoad(loadSettings);

  useEffect(() => {
    configureNotifications().catch((e) => console.warn(e));
  }, []);
  useEffect(() => {
    if (settings) SplashScreen.hideAsync().catch(() => {});
  }, [settings]);

  if (!settings) return null;
  return (
    <SafeAreaProvider>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Protected guard={settings.onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="apps" />
          <Stack.Screen name="review" />
          <Stack.Screen name="challenges" />
          <Stack.Screen name="goal/[id]" options={{ presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Protected guard={!settings.onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
      </Stack>
    </SafeAreaProvider>
  );
}
