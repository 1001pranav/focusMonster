import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { TodayProvider } from '@/data/today';
import { useTheme } from '@/ui/theme';

type Icon = ComponentProps<typeof Ionicons>['name'];

/** Outline when idle, filled when the tab is open. */
function icon(outline: Icon, filled: Icon) {
  function TabIcon({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
    return <Ionicons name={focused ? filled : outline} color={color as string} size={size} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <TodayProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('sunny-outline', 'sunny') }} />
        <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: icon('stats-chart-outline', 'stats-chart') }} />
        <Tabs.Screen name="goals" options={{ title: 'Goals', tabBarIcon: icon('flag-outline', 'flag') }} />
        <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings-outline', 'settings') }} />
      </Tabs>
    </TodayProvider>
  );
}
